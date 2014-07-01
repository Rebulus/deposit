define(['angular', 'utils'], function(angular){
	angular.module('Deposit.Components', ['Deposit.Utils'])
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
				template: function($elem, $attrs){
					var modelName = $attrs.ngModelName,
						warningText = $attrs.ngWarningText,
						warningCondition = $attrs.ngWarningCondition;

					return ('<div class="control-group {{!$parent.depositForm[modelName].$valid && \'error\'}}">\
								<label>{{label}}</label>\
								<input ng-input-text type="text" class="span12" value=""\
									name="' + (modelName ? modelName : 'none') + '"\
									ng-model="$parent.model[modelName]"\
									ng-pattern="$parent.patterns[modelName]"\
									ng-mask="' + $attrs.ngMask + '"\
									required\
									/>\
								<div class="text-error">{{error}}</div>' +
								(warningText ?
									'<div class="text-warning" ng-show="' + warningCondition + '">' + warningText + '</div>' :
									'') +
							'</div>');
				}
			}
		})
		.directive('ngInputText', ['$parse', 'utils', function($parse, utils){
			return {
				link: function ($scope, $element, $attrs) {
					var modelAccessor = $parse($attrs.ngModel);
					var maskType = $attrs.ngMask;
					var hasFirstClick = false;

					$element
						.attr('autocomplete', 'off')
						// TODO - remove timeout
						.on('focus click', function(){
							setTimeout(function(){
								if (!hasFirstClick) {
									this.select();
								}
								hasFirstClick = true;
							}.bind(this))
						})
						.on('blur', function() {
							hasFirstClick = false;
						});

					$scope.$watch(modelAccessor, function (val) {
						if(maskType != 'digit') return;

						modelAccessor.assign($scope, utils.toDigit(val));
					});

				}
			}
		}])
});
