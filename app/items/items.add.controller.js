(function() {
    'use strict';
    
    angular
        .module('app')
        .controller('ItemsAddController', Controller);
    
    Controller.$inject = ['ItemsFactory', 'ContainersService', '$mdToast'];
    
    /* @ngInject */
    function Controller(ItemsFactory, ContainersService, $mdToast) {
        var vm = this;
        vm.title = 'Controller';
        vm.containers = [];
        vm.newItem = new ItemsFactory();


        vm.submit = submit;


        activate();
        
        function activate() {
            ContainersService.all().$promise.then(function(data){
                vm.containers = data.results;
            });
        }

        function submit(){
            if(vm.newItem !== undefined && vm.newItem.name !== undefined && vm.newItem.container !== undefined && vm.newItem.image !== undefined){
                vm.newItem.$save(function(item, putResponseHeaders) {
                    $mdToast.show($mdToast.simple().content('Nice, o item ' + item.name + ' foi adicionado!'));
                    var container = vm.newItem.container;
                    vm.newItem = new ItemsFactory();
                    vm.newItem.container = container;
                });
            }else{
                $mdToast.show($mdToast.simple().content('Preenche tudo nabo nabo!'));
            }
        }
    }
})();