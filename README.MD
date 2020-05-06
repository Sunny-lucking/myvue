1.准备工作
============

** 我们先利用webpack构建项目:**

*   初始化项目
    
    `npm init -y`
    
*   安装webpack
    
    `npm i webpack webpack-cli webpack-dev-server html-webpack-plugin --save`
    
*   配置webpack
    

```js
    // webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
    entry:'./src/index.js',// 以src下的index.js 作为入口文件进行打包
    output:{
        filename:'bundle.js',
        path:path.resolve(__dirname,'dist')
    },
    devtool:'source-map', // 调试的时候可以快速找到错误代码
    resolve:{
        // 更改模块查找方方式（默认的是去node_modules里去找）去source文件里去找
        modules:[path.resolve(__dirname,'source'),path.resolve('node_modules')]
    },
    plugins:[
        new HtmlWebpackPlugin({
            template:path.resolve(__dirname,'public/index.html')
        })
    ]
}
```


    
*   配置package.json
    

```js
    "scripts": {
    "start": "webpack-dev-server",
    "build": "webpack"
  },
```

    
2 实现数据监听
==========
#### 2.1 创建构造函数MyVue

并初始化用户传入的参数`options`，我们先假设用户传入的`options`是只有`data`属性和`el`属性的。


```js
export function initState(vm) {
    let opt = vm.$optios
    if (opt.data){
        initData(vm);
    }
}

function initData(vm) {
    // 获取用户传入的data
    let data = vm.$optios.data
    // 判断是不是函数，我们知道vue，使用data的时候可以data：{}这种形式，也可以data(){return{}}这种形式
    // 然后把把用户传入的打他数据赋值给vm._data
    data = vm._data = typeof data === 'function' ? data.call(vm) : data ||{}

    observe(data)
}

```




到这里我们实现的是new MyVue的时候，通过_init方法来初始化options， 然后通过initData方法将data挂到vm实例的_data上去了，接下来，我们要对data实现数据监听，上面的代码中observe代码就是用来实现数据监听的。


#### 2.2 实现数据监听

```js
export function observe(data) {
    if (typeof data !== 'object' || data == null){
        return
    }
    return new Observe(data)
}

```
在这段代码observe方法的代码中，observe()将传入的data先进行判断，如果data是对象，则new 一个Observe对象来使这个data 实现数据监听，我们再看下Observe是怎么实现的

```js
class Observe {
    constructor(data){ // data就是我们定义的data vm._data实例
        // 将用户的数据使用defineProperty定义
        this.walk(data)
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

```
可见，Observe 将data传入walk方法里，而在walk方法里对data进行遍历，然后将data的每一个属性和对应的值传入`defineReactive`，我们不难猜测，这个`defineReactive`就是将data的每一个属性实现监听。我们再看下`defineReactive`。


```js
export function defineReactive(data,key,value) {
  
    Object.defineProperty(data,key,{
        get(){
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)
        }
    })
}

```
可见，这是通过defineProperty，=将每个key进行数据监听了。但是这里有一个问题，就是，这里只能监听一个层级，比如

```js
data = {
  wife:"迪丽热巴"
}
```
这时没问题的，但是
```js
data = {
  wife:{
    name："迪丽热码",
    friend:{
      name:"古力娜和"
    }
  }
}
```
我们只能监听到wife.friend和wife.name是否改变与获取，无法监听到wife.friend.name这个属性的变化，因此，我们需要判断wife.friend是不是对象,然后将这个friend对象进行遍历对它的属性实现监听
#### 2.3 解决多层级监听的问题
因此我们在上面代码的基础上，添加上`observe（value）`就实现了递归监听

```js
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)

    Object.defineProperty(data,key,{
        get(){
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
        }
    })
}

```
基本完成。

但是到这里，还有一个问题，就是我们上面的data都是new MyVue的时候传进去的，因此要是我们再new 完 改变data的某个值，如下面将message改成迪丽热巴对象，此时虽然我们依旧可以监听message，但是message.name是监听不到的


```js
let vm = new MyVue({
    el: '#app',
    data(){
        return{
            message:'大家好',
            wife:{
                name:"angelababy",
                age:28
            }
        }
    }
})
vm._data.message = {
    name:'迪丽热巴',
    age:30
}
```

#### 2.4 解决data中某个属性变化后无法监听的问题
我们知道 message这个属性已经被我们监听了，所以改变message的时候，会触发set（）方法，因此我们只需要将wife再放进observe()中重新实现监听一遍即可，如代码所示


```js
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)

    Object.defineProperty(data,key,{
        get(){
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)
        }
    })
}
```

#### 2.5 实现数据代理


我们用过vue的都知道，我们获取data中的属性的时候，都是直接通过this.xxx,获取值的，而我们上面只实现了想要获取值需要通过this._data.xxx,所以这一节来实现是数据代理，即将data中的属性挂载到vm上，我们可以实现一个proxy方法，该方法将传入的数据挂载到vm上，而当我们访问this.xxx的时候，其实是访问了this._data.xxx，这就是代理模式。
增加proxy后代码如下

```js
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

```

实现原理非常简单，实际上就是但我们想要获取`this.wife`时，其实是去获取`this._data.wife`


至此，我们已经实现了数据监听，但是还有个问题，即Object.defineProperty的问题，也是面试常见的问题，即Object.defineProperty是无法监听数组的变化的

## 3 重写数组方法

如图所示，我们企图往数组arr中添加值，结果发现新添加进去的值是没办法被监听到的，因此，我们需要改写push等方法

```js
let vm = new MyVue({
    el: '#app',
    data(){
        return{
            message:'大家好',
            wife:{
                name:"angelababy",
                age:28
            },
            arr:[1,2,{name:"赵丽颖"}]
        }
    }
})
vm.arr.push({hah:'dasd'})
```


基本思路就是之前我们调用push方法时，是从Aarray.prototype寻找这个方法，我们改成用一个空对象{} 继承 Aarray.prototype，然后再给空对象添加push方法
```
{
    push：function(){}
}
```
这样，我们调用push的时候，实际上就是调用上面{}中的push

现在，我们先区分出用户传入的Observe中接受监听的data是数组还是对象，如果是数组，则改变数组的原型链，这样才能改变调用push时，是调用我们自己设置的push，
只需要在Observe添加判断是数组还是对象即可。
```js
class Observe {
    constructor(data){ // data就是我们定义的data vm._data实例
        // 将用户的数据使用defineProperty定义
        if (Array.isArray(data)){
            data.__proto__ = arrayMethods
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
```


其中的`arrayMethods`则是我们一直说的那个对象{},它里面添加push等方法属性

```js
let oldArrayPrototypeMethods = Array.prototype
// 复制一份 然后改成新的
export let arrayMethods = Object.create(oldArrayPrototypeMethods)

// 修改的方法
let methods = ['push','shift','unshift','pop','reverse','sort','splice']

methods.forEach(method=>{
    arrayMethods[method] = function (...arg) {
        // 不光要返回新的数组方法，还要执行监听
        let res = oldArrayPrototypeMethods[method].apply(this,arg)
        // 实现新增属性的监听
        console.log("我是{}对象中的push,我在这里实现监听");
      
      
        return res
    }
})
```
实际上这是一种拦截的方法。
接下来，我们就要着手实现新增属性的监听。基本思路，1.获得新增属性，2.实现监听

```js
methods.forEach(method=>{
    arrayMethods[method] = function (...arg) {
        // 不光要返回新的数组方法，还要执行监听
        let res = oldArrayPrototypeMethods[method].apply(this,arg)
        // 实现新增属性的监听
        console.log("我是{}对象中的push,我在这里实现监听");
        // 实现新增属性的监听
        let inserted  // 1.获得新增属性
        switch (method) {
            case 'push':
            case 'unshift':
                inserted = arg
                break
            case 'splice':
                inserted = arg.slice(2)
                break
            default:
                break
        }
        // 实现新增属性的监听
        if (inserted){
            observerArray(inserted)
        }
        return res
    }

})
```
这里用到了`observerArray`，我们看一下

```js
export function observerArray(inserted){
    // 循环监听每一个新增的属性
    for(let i =0;i<inserted.length;i++){
        observe(inserted[i])
    }
}
```

可见，它是将inserted进行遍历，对每一项实现监听。可能这里你会有疑问，为什么要进行遍历，原因是inserted不一定是一个值，也可能是多个，例如[].push(1,2,3)。

现在已经实现了数组方法的拦截，还有个问题没有解决，就是当我们初始化的时候，data里面可能有数组，因此也要把这个数组进行监听


```js
constructor(data){ // data就是我们定义的data vm._data实例
    // 将用户的数据使用defineProperty定义
    if (Array.isArray(data)){
        data.__proto__ = arrayMethods
        observerArray(data)
    }else {
        this.walk(data)
    }
}
```

现在已经实现了对数据的监听，不过这里还有问题没解决，也是vue2.0中没有解决的问题，就是这里并没有实现对数组的每一项实现了监听
例如，这样是不会监听到的。

```js
let vm = new MyVue({
    el: '#app',
    data(){
        return{
            message:'大家好',
            wife:{
                name:"angelababy",
                age:28
            },
            arr:[1,2,{name:"赵丽颖"}]
        }
    }
})
vm.arr[0] = "我改了"
```

不仅如此，`vm.arr.length = 0`,当你这样设置数组长度时，也是无法监听到的。

源码地址：https://github.com/peigexing/myvue

