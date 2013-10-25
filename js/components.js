define(['libs/angular'], function(){
	angular.module('Components', [])
		.directive('inputField', function(){
			return {
				restrict: 'E',
				replace: true,
				transclude: true,
				template: '<div class="control-group {{!depositForm.startValue.$valid&&'error'}}">\
							<label>Начальная сумма вклада</label>\
							<input name="startValue" type="text" value=""\
								ng-pattern="patterns.startValue"\
								ng-model="model.startValue"\
								ng-click="fieldClick($event)"\
								required\
								autocomplete="off"/>\
							<div class="text-warning" ng-show="model.startValue && model.startCourse">В иностранной валюте: {{exchange()}}</div>\
							<div class="text-error" ng-show="!depositForm.startValue.$valid">Введите корректную сумму вклада</div>\
						</div>',
				link: function (scope, element, attrs) {
					console.log(scope, element, attrs);
				}
			}
		});
});
