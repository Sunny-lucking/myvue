let id = 0
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
        this.vm = vm
        this.exprOrFn = exprOrFn
        this.cb = cb
        this.id = id++
        if (typeof exprOrFn === 'function'){
            this.getter = exprOrFn
        }
        this.get()  // 创建一个watcher，默认调用此方法
    }
    get(){
        this.getter()
    }
}
export default Watcher
