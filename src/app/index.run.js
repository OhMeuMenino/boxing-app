(function () {
    'use strict';

    angular
        .module('app')
        .run(runBlock);

    /** @ngInject */
    function runBlock($rootScope, $state, AccountsTable) {
        $rootScope.$state = $state;
        $rootScope.loginChecked = false;
        $rootScope.mainStateChangeStart = $rootScope.$on('$stateChangeStart', function (event, toState) {

            var user = localStorage.getItem('member');
            if (user !== 'undefined' && user !== null) {
                user = angular.fromJson(user);


                if (!$rootScope.loginChecked) {
                    $rootScope.me = AccountsTable.$find('me').$then(function () {
                    }, function () {
                        $state.go('logout');
                    });
                    $rootScope.loginChecked = true;
                } else {
                    $rootScope.me = AccountsTable.$build(user);
                }
                $rootScope.me.$pk = user.id;


                if (toState.name === 'auth') {
                    event.preventDefault();
                    //$state.go('itemsList');
                }
            }
        });
    }

})();
