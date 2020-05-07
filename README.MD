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

## 4.初始化渲染页面

数据初始化之后，接下来，就要把初始化好的数据渲染到页面上去了也就是说当dom中有{{name}}这样的引用时，要把{{name}}替换成data里对应的数据

```js
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
```
$mount的功能很显然就是
1. 先获得dom树，
2. 然后替换dom树中的数据，
3. 然后再把新dom挂载到页面上去

我们看下实现代码

```js
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
```
显然，我们并没有看到上面所说的
1. 先获得dom树，
2. 然后替换dom树中的数据，
3. 然后再把新dom挂载到页面上去，

那肯定是把 这些步骤放在 `vm._update()`的时候实现了。
我们来看下update代码

```js
// 拿到数据更新视图
MyVue.prototype._update = function () {
    let vm = this
    let el = vm.$el
    // 1. 获取dom树
    let node = document.createDocumentFragment()
    let firstChild
    while (firstChild = el.firstChild){
        node.appendChild(firstChild)
    }
    // 2.然后替换dom树中的数据，
    compiler(node,vm)

    //3.然后再把新dom挂载到页面上去，
    el.appendChild(node) 
}
```
可见，这三个步骤在update的时候实现了。

而这个update方法的执行需要 

```js
    let updateComponent = () =>{
        console.log("更新和渲染的实现");
        vm._update()
    }
```
这个方法的执行，
显然，这个方法是new Wacther的时候执行的。

```js
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
```
可见，this.getter就是我们传进去的`updateComponent`，然后在new Wacther的时候，就自动执行了。

总结下思路，
1. new Watcher的时候执行了 `updateComponent`
2. 执行 `updateComponent` 的时候执行了 `update`
3. 执行update的时候执行了 1. 先获得dom树，2. 然后替换dom树中的数据，3. 然后再把新dom挂载到页面上去

现在我们就已经实现了初始化渲染。即把dom中{{}}表达式换成了data里的数据。

上面用到的compile方法我们还没解释，其实，很简单

```js
const defaultRGE = /\{\{((?:.|\r?\n)+?)\}\}/g

export const util = {
    getValue(vm,exp){
        let keys = exp.split('.')
        return keys.reduce((memo,current)=>{
            memo = memo[current]
            return memo
        },vm)
    },
    compilerText(node,vm){
        node.textContent = node.textContent.replace(defaultRGE,function (...arg) {
           return util.getValue(vm,arg[1])
        })
    }
}

export function compiler(node,vm) {
    // 1 取出子节点、
    let childNodes = node.childNodes
    childNodes = Array.from(childNodes)
    childNodes.forEach(child =>{
        if (child.nodeType === 1 ){
            compiler(child,vm)
        }else if (child.nodeType ===3) {
            util.compilerText(child,vm)
        }
    })
}
```


## 5.更新数据渲染页面
我们上一节只实现了 初始化渲染，这一节来实现 数据一旦修改就重新渲染页面。上一节中，我们是通过new Watcher()来初始化页面的，也就是说这个watcher具有重新渲染页面的功能，因此，我们一旦改数据的时候，就再一次让这个watcher执行刷新页面的功能。这里有必要解释下一个watcher对应一个组件，也就是说你new Vue 机会生成一个wacther，因此有多个组件的时候就会生成多个watcher。

现在，我们给每一个data里的属性生成一个对应的dep。
例如：

```js
data:{
  age:18,
  friend:{
    name:"赵丽颖",
    age:12
  }
}
```
上面中，age,friend,friend.name,friend.age分别对应一个dep。一共四个dep。dep的功能是用来通知上面谈到的watcher执行刷新页面的功能的。

```js
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)
    let dep = new Dep() // 新增代码：一个key对应一个dep
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
现在有一个问题，就是dep要怎么跟watcher关联起来，我们可以把watcher存储到dep里



```js
let id = 0
class Dep {
    constructor(){
        this.id = id++
        this.subs = []
    }
    addSub(watcher){ //订阅
        this.subs.push(watcher)
    }
}
```
如代码所示，我们希望执行addSub方法就可以将watcher放到subs里。
那什么时候可以执行addSub呢？

我们在执行compile的时候，也就是将dom里的{{}}表达式换成data里的值的时候，因为要获得data里的值，因此会触发get。这样，我们就可以在get里执行addSub。而watcher是放在全局作用域的，我们可以直接重全局作用域中拿这个watcher放到传入addSub。

好了，现在的问题就是，怎么把watcher放到全局作用域
```js
let id = 0
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
        this.vm = vm
        this.exprOrFn = exprOrFn
        this.cb = cb
        this.id = id++
        this.deps = []
        this.depsId = new Set()
        if (typeof exprOrFn === 'function'){
            this.getter = exprOrFn
        }
        this.get()  // 创建一个watcher，默认调用此方法
    }
    get(){
        pushTarget(this)
        this.getter()
        popTarget()
    }
}
export default Watcher
```
可见，是通过pushTarget(this)放到全局作用域，再通过popTarget()将它移除。

要知道，wachter和dep是多对多的关系，dep里要保存对应的watcher，watcher也要保存对应的dep
因此，但我们触发get的时候，希望可以同时让当前的watcher保存当前的dep，也让当前的dep保存当前的wacther

```js
export function defineReactive(data,key,value) {
    // 观察value是不是对象，是的话需要监听它的属性。
    observe(value)
    let dep = new Dep()
    Object.defineProperty(data,key,{
        get(){
            if (Dep.target){
                dep.depend() //让dep保存watcher，也让watcher保存这个dep
            }
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

让我们看下depend方法怎么实现


```js
let id = 0
class Dep {
    constructor(){
        this.id = id++
        this.subs = []
    }
    addSub(watcher){ //订阅
        this.subs.push(watcher)
    }
    depend(){
        if (Dep.target){
            Dep.target.addDep(this)
        }
    }
}
// 保存当前watcher
let stack = []
export function pushTarget(watcher) {
    Dep.target = watcher
    stack.push(watcher)
}
export function popTarget() {
    stack.pop()
    Dep.target = stack[stack.length - 1]
}

export default Dep

```
可见depend方法又执行了watcher里的addDep，看一下watcher里的addDep。

```js
import {pushTarget , popTarget} from "./dep"
let id = 0
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
        this.vm = vm
        this.exprOrFn = exprOrFn
        this.cb = cb
        this.id = id++
        this.deps = []
        this.depsId = new Set()
        if (typeof exprOrFn === 'function'){
            this.getter = exprOrFn
        }
        this.get()  // 创建一个watcher，默认调用此方法
    }
    get(){
        pushTarget(this)
        this.getter()
        popTarget()
    }
    update(){
        this.get()
    }
    addDep(dep){
        let id = dep.id
        if(this.depsId.has(id)){
            this.depsId.add(id)
            this.deps.push(dep)
        }
        dep.addSub(this)
    }
}
export default Watcher

```

如此一来，就让dep和watcher实现了双向绑定。
这里代码，你可能会有个疑问，就是为什么是用一个stack数组来保存watcher，这里必须解释下，因为每一个watcher是对应一个组件的，也就是说，当页面中有多个组件的时候，就会有多个watcher，而多个组件的执行是依次执行的，也就是说Dep.target中 只会有 当前被执行的组件所对应的watcher。

例如，有一道面试题：父子组件的执行顺序是什么？

答案：在组件开始生成到结束生成的过程中，如果该组件还包含子组件，则自己开始生成后，要让所有的子组件也开始生成，然后自己就等着，直到所有的子组件生成完毕，自己再结束。“父亲”先开始自己的created，然后“儿子”开始自己的created和mounted，最后“父亲”再执行自己的mounted。

为什么会这样，到这里我们就应该发现了，new Vue的时候是先执行initData，也就是初始化数据，然后执行$mounted,也就是new Watcher。而初始化数据的时候，也要处理components里的数据。处理component里的数据的时候，每处理一个子组件就会new Vue，生成一个子组件。因此是顺序是这样的。也就对应了上面的答案。
1. 初始化父组件数据-->
2. 初始化 子组件数据 -->
3. new 子组件Wacther -->
4. new 父组件Watcher

好，言归正传，回到我们的项目来，接下来要实现的就是 当有数据更改的时候，我们要重新渲染页面。而我们可以通过set来监听数据是否被更改，因此基本步骤为：

1. set监听到数据被更改
2. 让dep执行dep.notify()通知与它相关的watcher
3. watcher执行update，重新渲染页面


```js
 Object.defineProperty(data,key,{
        get(){
            if (Dep.target){
                dep.depend() //让dep保存watcher，也让watcher保存这个dep
            }
            return value
        },
        set(newValue){
            if (newValue === value) return
            value = newValue
            observe(value)

            // 当设置属性的时候，通知watcher更新
            dep.notify()

        }
    })
```

dep添加notify方法
```js
class Dep {
    constructor(){
        this.id = id++
        this.subs = []
    }
    addSub(watcher){ //订阅
        this.subs.push(watcher)
    }
    notify(){ //发布
        this.subs.forEach(watcher =>{
            watcher.update()
        })
    }
    depend(){
        if (Dep.target){
            Dep.target.addDep(this)
        }
    }
}
```


watcher添加update方法
```js
class Watcher {
    constructor(vm,exprOrFn,cb = ()=>{},opts){
        this.vm = vm
        this.exprOrFn = exprOrFn
        this.cb = cb
        this.id = id++
        this.deps = []
        this.depsId = new Set()
        if (typeof exprOrFn === 'function'){
            this.getter = exprOrFn
        }
        this.get()  // 创建一个watcher，默认调用此方法
    }
    get(){
        pushTarget(this)
        this.getter()
        popTarget()
    }
    update(){
        this.get()
    }
    addDep(dep){
        let id = dep.id
        if(this.depsId.has(id)){
            this.depsId.add(id)
            this.deps.push(dep)
        }
        dep.addSub(this)
    }
}
export default Watcher
```



源码地址：https://github.com/peigexing/myvue

