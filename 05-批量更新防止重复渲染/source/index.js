import {initState} from "./Observe/index";
import {compiler} from "./Observe/utils";
import Watcher from './Observe/Watcher'
function MyVue(options) {
    this._init(options)
}

MyVue.prototype._init = function (options) {
    let vm = this;
    // this.$options表示是Vue中的参数,如若我们细心的话我们发现vue框架的可读属性都是$开头的
    vm.$options = options;

    // MVVM原理 重新初始化数据  data
    initState(vm)

    // 初始化渲染页面
    if (vm.$options.el){
        vm.$mount()
    }
}

function query(el) {
    console.log(el+'2222');
    if (typeof el === 'string'){
        console.log(el);
        return document.querySelector(el)
    }
    return el
}
MyVue.prototype.$mount = function () {
    let vm = this
    let el = vm.$options.el
    el = vm.$el = query(el) //获取当前节点

    let updateComponent = () =>{
        console.log("更新和渲染的实现");
        vm._update()
    }
    new Watcher(vm,updateComponent)
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

