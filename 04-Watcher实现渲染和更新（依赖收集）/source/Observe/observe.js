import {observe} from "./index";
import {arrayMethods, observerArray} from "./array";
import Dep from "./dep";

class Observe {
    constructor(data){ // data就是我们定义的data vm._data实例
        // 将用户的数据使用defineProperty定义
        if (Array.isArray(data)){
            data.__proto__ = arrayMethods
            observerArray(data)
        }else {
            this.walk(data)
        }
    }
    walk(data){
        let keys = Object.keys(data)
        for (let i = 0;i<keys.length;i++){
            let key  = keys[i]; // 所有的key
            let value = data[keys[i]] //所有的value
            defineReactive(data,key,value)
        }
    }
}
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)
    let dep = new Dep()
    Object.defineProperty(data,key,{
        get(){
            if (Dep.target){
                dep.depend()
            }
            return value
        },
        set(newValue){
            if (newValue === value) return
            observe(value)
            value = newValue
            // 当属性变更时,实现更新
            dep.notify()
        }
    })
}


export default Observe
