import {initState} from "./Observe/index";
import {compiler} from "./Observe/utils";

function MyVue(options) {
    this._init(options)
}

MyVue.prototype._init = function (options) {
    let vm = this;
    // this.$options表示是Vue中的参数,如若我们细心的话我们发现vue框架的可读属性都是$开头的
    vm.$options = options;

    // MVVM原理 重新初始化数据  data
    initState(vm)

    this.$mount()
}

function query(el) {
    console.log(el+'2222');
    if (typeof el === 'string'){
        console.log(el);
        return document.querySelector(el)
    }
    return
}
MyVue.prototype.$mount = function () {
    let vm = this
    let el = vm.$options.el
    vm.$el = query(el)

    vm._update()
}
// 拿到数据更新视图
MyVue.prototype._update = function () {
    let vm = this
    let el = vm.$el
    // 渲染所有元素 把内容替换为数据
    let node = document.createDocumentFragment()
    let firstChild
    while (firstChild = el.firstChild){
        node.appendChild(firstChild)
    }
    // 文本替换
    compiler(node,vm)

    el.appendChild(node) //替换完再放进去
}

export default MyVue

