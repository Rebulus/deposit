requirejs.config({
	paths: {
		'angular': 'libs/angular/angular'
	},
	shim: {
		'angular': {
			exports: 'angular'
		}
	}
});

requirejs(['angular', 'utils', 'components', 'model'], function(angular){
	var intPattern = /^\d+$/,
		digitPattern = /^(\d+([ ])?)+$/,
		floatPattern = /^\d+(\.\d+)?$/,
		toDigit = ['startValue', 'totalAmount', 'startCourse', 'endCourse', 'result', 'criticCourse'];

	angular.module('Deposit', ['Deposit.Utils', 'Deposit.Models', 'Deposit.Components'])
		.controller('DepositFormController', ['$scope', 'utils', 'model', function($scope, utils, model){

			// Получение данных предыдущих расчетов
			model.fetch();

			angular.extend($scope, {
				utils: utils,

				patterns: {
					startValue: digitPattern,
					percent: floatPattern,
					time: intPattern,
					startCourse: digitPattern,
					endCourse: intPattern,
					currencyPercent: floatPattern
				},

				model: model.current,

				previous: model.previous,

				// Перевод объекта данных к дням
				dataToDays: function(data){
					var result = 0,
						timeType;
					if(data && typeof data == 'object'){
						timeType = utils.toInt(data.timeType);
						switch(timeType){
							case 0:
								result = utils.monthToDay(data.time);
								break;
							case 1:
								result = utils.toFloat(data.time);
								break;
						}
					}
					return result;
				},

				calculateResult: function(event, noSetToBuffer) {
					var scopeModel = $scope.model;
					$scope.isShowEndCourseField = false;

					if(!$scope.depositForm.$valid){
						scopeModel.result = '';
						return;
					}

					var startValue = utils.toFloat(scopeModel.startValue),
						startCourse = utils.toFloat(scopeModel.startCourse),
						time = utils.toFloat(scopeModel.time),
						percent = utils.toFloat(scopeModel.percent) / 100,
						percentsStep = percent / 365,
						currencyPercent = utils.toFloat(scopeModel.currencyPercent) / 100,
						currencyPercentStep = currencyPercent / 365,
						result = startValue,
						currencyResult = utils.exchange(startValue, startCourse),
						isCapitalize = scopeModel.isCapitalize,
						i, len, additionals, additionalsHash = {};

					// Расчет времени прибывания вклада в днях
					switch(utils.toInt(scopeModel.timeType)){
						case 0:
							time = Math.round((365 / 12) * time);
							break;
					}

					// Если надо учитывать дополнительные платежи
					if(scopeModel.isAdditional){
						// Приведение пополнений к дням и сортировка
						additionals = angular.copy($scope.model.additionals);
						additionals.sort(function(a, b){
							var aTime = $scope.dataToDays(a),
								bTime = $scope.dataToDays(b);
							return aTime - bTime;
						});

						// Создание хэш массива пополнений по номеру дня
						for(i = 0, len = additionals.length; i < len; i++){
							var additional = additionals[i],
								additionalTime = $scope.dataToDays(additional),
								value = utils.toFloat(additional.value),
								course = utils.toFloat(additional.course),
								currencyValue = 0;

							if (!course) {
								course = startCourse;
							}

							currencyValue = utils.exchange(value, course);

							if(additionalsHash[additionalTime]){
								additionalsHash[additionalTime].value += value;
								additionalsHash[additionalTime].currencyValue += currencyValue;
							}
							else {
								additionalsHash[additionalTime] = {
									value: value,
									currencyValue: currencyValue
								};
							}
						}
					}

					scopeModel.totalAmount = result;
					for(i in additionalsHash){
						if(additionalsHash.hasOwnProperty(i)){
							scopeModel.totalAmount += additionalsHash[i].value;
						}
					}

					if(isCapitalize){
						// Если капитализация ежемесечная
						if(scopeModel.timeType == "0"){
							for(i = 1; i <= time; i++){
								if(!(i % 30)){
									var resultAdditional = 0,
										currencyAdditional = 0;
									for(var j in additionalsHash){
										if(additionalsHash.hasOwnProperty(j)){
											j = utils.toFloat(j);
											// Если вложение попало в текущий месяц
											if(j < i){
												var days = (i - utils.toFloat(j));
												additional = additionalsHash[j];
												resultAdditional += additional.value * (1 + days * percentsStep);
												currencyAdditional += additional.currencyValue * (1 + days * currencyPercentStep);
												// Удаление использованного вложения
												delete additionalsHash[j];
											}
										}
									}
									result += result * percentsStep * 30 + resultAdditional;
									currencyResult += currencyResult * currencyPercentStep * 30 + currencyAdditional;
								}
							}

							// Если остались не вошедшие в период дополнительные взносы
							for(j in additionalsHash){
								if(additionalsHash.hasOwnProperty(j)){
									additional = additionalsHash[j];
									result += additional.value;
									currencyResult += additional.currencyValue;
								}
							}
						}
						else {
							for(i = 1; i <= time; i++){
								result += result * percentsStep;
								currencyResult += currencyResult * currencyPercentStep;
								additional = additionalsHash[i];
								if(additional){
									result += additional.value;
									currencyResult += additional.currencyValue;
								}
							}
						}

					}
					else {
						result *= 1 + percentsStep * time;
						currencyResult *= 1 + currencyPercentStep * time;
						if(additionalsHash){
							var additionalValue = 0;
							var additionalCurrencyValue = 0;
							for(i in additionalsHash){
								if(additionalsHash.hasOwnProperty(i)){
									additionalTime = time - utils.toInt(i);
									if(additionalTime < 0 ){
										additionalTime = 0;
									}
									additionalValue += additionalsHash[i].value * (1 + percentsStep * additionalTime);
									additionalCurrencyValue += additionalsHash[i].currencyValue * (1 + percentsStep * additionalTime);
								}
							}
							result += additionalValue;
							currencyResult += additionalCurrencyValue;
						}
					}

					scopeModel.result = result.toFixed(2);
					scopeModel.endCourse = utils.toFloat(scopeModel.endCourse) ? scopeModel.endCourse : scopeModel.startCourse;
					scopeModel.criticCourse = utils.exchange(result, currencyResult);

					// Приведение к формату чисел
					for(var key in toDigit){
						if(toDigit.hasOwnProperty(key)){
							scopeModel[toDigit[key]] = utils.toDigit(scopeModel[toDigit[key]]);
						}
					}

					// Запись реузльтата расчета в память
					if(!noSetToBuffer){
						model.save();
						model.fetch();
						$scope.previous = model.previous;
					}
				},

				isCanCalculate: function(){
					return utils.toFloat($scope.model.startValue)
				},

				isCanShowExchangeToStartValue: function(){
					return utils.toFloat($scope.model.startValue) && utils.toFloat($scope.model.startCourse);
				},

				showCalculation: function(){
					model.current = angular.extend({}, model.previous[this.$index]);
					$scope.model = model.current;
					$scope.calculateResult(null, true)
				},

				clearCalculations: function(){
					model.clear();
					$scope.previous = model.previous;
				},

				exchange: function(){
					return utils.exchange($scope.model.startValue, $scope.model.startCourse);
				},

				exchangeResult: function(){
					return utils.exchange($scope.model.result, $scope.model.endCourse);
				},

				startChangeResultCourse: function(){
					$scope.isShowEndCourseField = true;
				},

				changeResultCourse: function(){
					var model = $scope.model;
					if(!model.endCourse){
						model.endCourse = 0;
					}
				},

				setResultCourse: function(){
					$scope.isShowEndCourseField = false;
				},

				showAdditional: function(){
					$scope.model.isAdditional = !$scope.model.isAdditional;
				},

				checkCurrentAdditional: function(index){
					var additionals = $scope.model.additionals,
						currentAdditional = additionals[index];
					return !!(utils.toFloat(currentAdditional.value) && utils.toFloat(currentAdditional.time));
				},

				addNewAdditional: function(index){
					var additionals = $scope.model.additionals,
						currentAdditional = additionals[index];
					// Запрет добавления нового поступления, если оно не было заполнено
					if(!$scope.checkCurrentAdditional(index)){
						return false;
					}
					// Добавление поступление и открытие нового поля для заполнения
					currentAdditional.isNew = false;

					if (index === additionals.length - 1) {
						additionals.push({
							value: 0,
							time: 0,
							timeType: currentAdditional.timeType,
							isNew: true
						});
					}
				},

				removeAdditional: function(index){
					$scope.model.additionals.splice(index, 1);
				},

				editAdditional: function(index) {
					$scope.model.additionals[index].isNew = true;
				},

				// Начисленные проценты
				getPercentResult: function(type) {
					var result = utils.toFloat($scope.model.result) - utils.toFloat($scope.model.totalAmount);

					if (type === 'exchange') {
						result = utils.exchange(result, $scope.model.endCourse);
					} else {
						result = result.toFixed(2);
					}

					return utils.toDigit(result);
				},

				// потери на курсе
				pureResult: function() {
					// TODO - расчитывается не коректно, т.к. не учитывает промежуточных курсов пополнений вклада
					var result = utils.toFloat($scope.model.result) - utils.toFloat($scope.model.totalAmount);
					result = utils.exchange(result, $scope.model.endCourse);
					result -= utils.exchange($scope.model.totalAmount, $scope.model.startCourse) -
						      utils.exchange($scope.model.totalAmount, $scope.model.endCourse);
					return utils.toDigit(result.toFixed(2));
				}
			});

	}]);

	angular.bootstrap(document.body, ['Deposit'])
});
