1.准备工作
============

** 我们先利用webpack构建项目:**

*   初始化项目
    
    `npm init -y`
    
*   安装webpack
    
    `npm i webpack webpack-cli webpack-dev-server html-webpack-plugin --save`
    
*   配置webpack
    
    ![image.png](/img/bVbFUVx)
    
*   配置package.json
    
   ![image.png](/img/bVbFUVz)
    
2 实现数据监听
==========
#### 2.1 创建构造函数MyVue

并初始化用户传入的参数`options`，我们先假设用户传入的`options`是只有`data`属性和`el`属性的。

![image.png](/img/bVbFUYk)

![image.png](/img/bVbFUWm)

到这里我们实现的是new MyVue的时候，通过_init方法来初始化options， 然后通过initData方法将data挂到vm实例的_data上去了

我们可以通过new MyVue来看下是否成功挂上去了
![image.png](/img/bVbFUXY)
![image.png](/img/bVbFUXM)
可见已经有了_data属性了

#### 2.2 实现数据监听
想要实现数据双向绑定，就需要先实现数据监听，**我们可以实现一个observe方法来实现数据监听**

![image.png](/img/bVbFU9B)

我们将`vm.data`通过`Object.defineProperty `实现数据监听，
其中，我们将`vm.data`传入`Observe`的对象中，这个对象就是调用 `Object.defineProperty `来实现数据监听的，`Observe`类定义如下
![image.png](/img/bVbFU9V)

接下来我们打印vm看下，是否成功实现数据监听
![image.png](/img/bVbFVac)
打印发现`_data`中的属性`message`已经变成...说明成功（因为我们点击...的时候就会触发get（））
但是这里会有一个问题，就是这里只实现了一层的数据监听，即如果data中有个对象属性的话呢?如下面的wife,现在只能监听到wife这一层，但是wife.name 和wife.age我们是监听不到变化的
![image.png](/img/bVbFVaF)

#### 2.3 解决多层级监听的问题
接下来我们实现多层级监听，要想监听到wife.name，需要用到递归
当我们判断 data中的某个属性是对象的时候（如wife），我们要调用observe，将wife放入到observe中实现监听wife的属性，因此我们在上面代码的基础上，添加上`observe（value）`就实现了递归监听

![image.png](/img/bVbFVa4)

然后打印发现，wife的属性也实现了监听
![image.png](/img/bVbFVbe)

但是到这里，还有一个问题，就是我们上面的data都是new MyVue的时候传进去的，因此要是我们再new 完 改变data的某个值，如下面将wife改成迪丽热巴，打印发现就没办法实现监听了

![image.png](/img/bVbFVcd)

![image.png](/img/bVbFVcg)

#### 2.4 解决data中某个属性变化后无法监听的问题
我们知道 wife这个属性已经被我们监听了，所以改变wife的时候，会触发set（）方法，因此我们只需要将wife再放进observe()中重新实现监听一遍即可，如代码所示
![image.png](/img/bVbFVcq)

打印发现实现了监听

![image.png](/img/bVbFVct)

#### 2.5 实现数据代理


我们用过vue的都知道，我们获取data中的属性的时候，都是直接通过this.xxx,获取值的，而我们上面只实现了想要获取值需要通过this._data.xxx,所以这一节来实现是数据代理，即将data中的属性挂载到vm上，我们可以实现一个proxy方法，该方法将传入的数据挂载到vm上，而当我们访问this.xxx的时候，其实是访问了this._data.xxx，这就是代理模式。
增加proxy后代码如下
![image.png](/img/bVbFVdp)

打印发现，vm中已经有了data中的属性

![image.png](/img/bVbFVdr)

至此，我们已经实现了数据监听，但是还有个问题，即Object.defineProperty的问题，也是面试常见的问题，即Object.defineProperty是无法监听数组的变化的
