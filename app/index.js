require('milligram');
import Vue from 'vue'
import Home from './vues/home'

new Vue({
    el: '#app',
    render: h => h(Home)
});