import {initState} from "./Observe/index";

function MyVue(options) {
    this._init(options)
}

MyVue.prototype._init = function (options) {
    let vm = this;
    // this.$options表示是Vue中的参数,如若我们细心的话我们发现vue框架的可读属性都是$开头的
    vm.$optios = options;

    // MVVM原理 重新初始化数据  data
    initState(vm)
}



export default MyVue

