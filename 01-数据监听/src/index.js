import MyVue from "../source/index"

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
vm._data.wife = {
    name:'迪丽热巴',
    age:30
}
console.log(vm)
