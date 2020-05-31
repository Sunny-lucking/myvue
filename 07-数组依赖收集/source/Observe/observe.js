import {observe} from "./index";
import {arrayMethods, observerArray,dependArray} from "./array";
import Dep from "./dep";

class Observe {
    constructor(data){ // data就是我们定义的data vm._data实例
        // 将用户的数据使用defineProperty定义
        // 创建数组专用 的dep
        this.dep = new Dep()
        // 给我们的对象包括我们的数组添加一个属性__ob__ (这个属性即当前的observe)
        Object.defineProperty(data,'__ob__',{
            get:() => this
        })
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
    let childOb = observe(value)
    let dep = new Dep()
    Object.defineProperty(data,key,{
        get(){
            if (Dep.target){
                dep.depend() //让dep保存watcher，也让watcher保存这个dep

                if (childOb){
                    childOb.dep.depend()
                    dependArray(value) //收集儿子的依赖
                }
            }
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)

            // 当设置属性的时候，实现更新
            dep.notify()

        }
    })
}


export default Observe
