import Observe from "./observe";
import Watcher from "./Watcher";
import Dep from "./dep";

export function initState(vm) {
    let opt = vm.$options
    if (opt.data){
        initData(vm);
    }
    if (opt.watch){
        initWathch(vm);
    }
    if (opt.computed){
        initComputed(vm,opt.computed)
    }
}
function createComputedGetter(vm,key) {
    let watcher = vm._watcherComputed[key]
    return function () {
        if (watcher) {
            if (watcher.dirty){
                // 页面取值的时候，dirty如果为true，就会调用get方法计算
                watcher.evalValue()
            }
            if (Dep.target){
                watcher.depend()
            }
            return watcher.value
        }
    }
}
function initComputed(vm,computed) {
    let watchers = vm._watcherComputed = Object.create(null)
    for(let key in computed){
        let userDef = computed[key]
        watchers[key] = new Watcher(vm,userDef,()=>{},{lazy:true})

        // 当用户取值的时候，我们将key定义到vm上
        Object.defineProperty(vm,key,{
            get:createComputedGetter(vm,key)
        })
    }
}
function initWathch(vm) {
    let watch = vm.$options.watch
    for (let key in watch){
        let handler = watch[key]
        createWatch(vm,key,handler)
    }
}
function createWatch(vm,key,handler) {
    return vm.$watch(key,handler)
}
function initData(vm) {
    // 获取用户传入的data
    let data = vm.$options.data
    // 判断是不是函数，我们知道vue，使用data的时候可以data：{}这种形式，也可以data(){return{}}这种形式
    // 然后把把用户传入的打他数据赋值给vm._data
    data = vm._data = typeof data === 'function' ? data.call(vm) : data ||{}

    for (let key in data) {
        proxy(vm,"_data",key)
    }

    observe(data)
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

export function observe(data) {
    if (typeof data !== 'object' || data == null){
        return
    }

    if (data.__ob__){
        return data.__ob__
    }
    return new Observe(data)
}
