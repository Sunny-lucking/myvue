import Observe from "./observe";

export function initState(vm) {
    let opt = vm.$optios
    if (opt.data){
        initData(vm);
    }
}
function proxy(vm,source,key) {
    Object.defineProperty(vm,key,{
        get(){
            return vm[source][key]
        },
        set(newValue){
            return vm[source][key] = newValue
        }
    })
}
function initData(vm) {
    // 获取用户传入的data
    let data = vm.$optios.data
    // 判断是不是函数，我们知道vue，使用data的时候可以data：{}这种形式，也可以data(){return{}}这种形式
    // 然后把把用户传入的打他数据赋值给vm._data
    data = vm._data = typeof data === 'function' ? data.call(vm) : data ||{}

    for (let key in data) {
        proxy(vm,"_data",key)
    }

    observe(data)
}



export function observe(data) {
    if (typeof data !== 'object' || data == null){
        return
    }
    return new Observe(data)
}
