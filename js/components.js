define(['utils','libs/angular'], function(utils){
	angular.module('Components', [])
		.directive('inputField', function(){
			return {
				restrict: 'E',
				replace: true,
				transclude: true,
				scope: {
					label: '@ngLabel',
					error: '@ngError',
					modelName: '@ngModelName',
					mask: '@ngMask'
				},
				controller: function($scope){
					angular.extend($scope, {
						change: function(){
							if($scope.mask != 'digit') return;

							var modelName = $scope.modelName,
								model = $scope.$parent.model;
							model[modelName] = utils.toDigit(model[modelName]);
						}
					})
				},
				template: function($elem, $attrs){
					var modelName = $attrs.ngModelName,
						warningText = $attrs.ngWarningText,
						warningCondition = $attrs.ngWarningCondition;

					return ('<div class="control-group {{!$parent.depositForm[modelName].$valid && \'error\'}}">\
								<label>{{label}}</label>\
								<input ng-input-text type="text" value=""\
									name="' + (modelName ? modelName : 'none') + '"\
									ng-model="$parent.model[modelName]"\
									ng-pattern="$parent.patterns[modelName]"\
									required\
									/>\
								<div class="text-error">{{error}}</div>' +
								(warningText ?
									'<div class="text-warning" ng-show="' + warningCondition + '">' + warningText + '</div>' :
									'') +
							'</div>');
				},
				link: function($scope){
					$scope.$parent.$watch('model.' + $scope.modelName, function(){
						$scope.change();
					})
				}
			}
		})
		.directive('ngInputText', ['$parse', function($parse){
			return {
				link: function ($scope, $element, $attrs) {
					var modelAccessor = $parse($attrs.ngModel),
						maskType = $attrs.ngMask;

					$element
						.attr('autocomplete', 'off')
						// TODO - remove timeout
						.on('focus click', function(){
							setTimeout(function(){
								this.select();
							}.bind(this))
						});

					$scope.$watch(modelAccessor, function (val) {
						if(maskType != 'digit') return;

						modelAccessor.assign($scope, utils.toDigit(val));
					});

				}
			}
		}])
});
