require(['utils', 'components', 'libs/angular'], function(utils){
	var intPattern = /^\d+$/,
		digitPattern = /^(\d+([ ])?)+$/,
		floatPattern = /^\d+(\.\d+)?$/,
		// Максимальное колличество сохраняемых депозитов
		MAX_SAVE_OF_DEPOSIT = 5,

		// Обертка над стандартных localStorage для учета его существования или
		// переполнения
		emptyFunction = function(){},
		fakeLocalStorage = {
			setItem: emptyFunction,
			getItem: emptyFunction,
			removeItem: emptyFunction,
			clear: emptyFunction
		},
		localStorage = (function(){
			var localStorage = window.localStorage;
			if(typeof localStorage != 'undefined' ) {

				// Проверка на возможность работы с localStorage
				try {
					localStorage.setItem('foo', 'bar');
				} catch (e) {
					if (e == QUOTA_EXCEEDED_ERR) {
						return fakeLocalStorage
					}
				}

				return localStorage;
			}
			else {
				return fakeLocalStorage;
			}
		})(),
		toDigit = ['startValue', 'totalAmount', 'startCourse', 'endCourse', 'result', 'criticCourse'];

	var deposit = angular.module('Deposit', ['Components']);

	deposit.controller('DepositFormController', ['$scope', function($scope){
		angular.extend($scope, {
			patterns: {
				startValue: digitPattern,
				percent: floatPattern,
				time: intPattern,
				startCourse: digitPattern,
				endCourse: intPattern,
				currencyPercent: floatPattern
			},

			model: {
				startValue: 0, // начальное значение вклада
				percent: 0, // процент вклада
				totalAmount: 0, // общая сумма вклада, с учетом добавления
				timeType: 0, // 0 - в месяцах, 1 - в днях
				time: 0, // колличество времени (исчисление зависит от timeType)
				isCapitalize: true, // вклад с капитализацией
				startCourse: 0, // курс на момент вклада
				endCourse: 0, // курс на момент окончания срока вклада
				currencyPercent: 0, // проценты по валютному вкладу
				criticCourse: 0, // критический курс, при котором вклад равен валютному
				result: '', // размер вклада на момент окончания его срока
				isAdditional: false, // присутствие дополнительных взносов
				additionals: [{ // список дополнительных взносов
					value: 0,
					time: 0,
					timeType: 0,
					isNew: true
				}]
			},

			// Чтение предыдущих калькуляций
			setCalculation: function(){
				$scope.previousCalculation = [];
				var depositsLength = utils.toInt(localStorage.getItem('depositsLength'));
				if(depositsLength){
					for(var i = 1; i <= depositsLength; i++){
						var depositItem = localStorage.getItem('deposit_' + i);
						depositItem = JSON.parse(depositItem);
						$scope.previousCalculation.push(depositItem);
					}
				}
			},

			// Перевод объекта данных к дням
			dataToDays: function(data){
				var result = 0;
				if(data && typeof data == 'object' && data.timeType == 0){
					result = utils.monthToDay(data.time);
				}
				return result;
			},

			calculateResult: function(event, noSetToBuffer) {
				var model = $scope.model;
				$scope.isShowEndCourseField = false;

				if(!$scope.depositForm.$valid){
					model.result = '';
					return;
				}

				var startValue = utils.toFloat(model.startValue),
					startCourse = utils.toFloat(model.startCourse),
					time = utils.toFloat(model.time),
					percent = utils.toFloat(model.percent) / 100,
					percentsStep = percent / 365,
					currencyPercent = utils.toFloat(model.currencyPercent) / 100,
					currencyPercentStep = currencyPercent / 365,
					result = startValue,
					currencyResult = utils.exchange(startValue, startCourse),
					isCapitalize = model.isCapitalize,
					i, len, additionals, additionalsHash = {};

				// Расчет времени прибывания вклада в днях
				switch(utils.toInt(model.timeType)){
					case 0:
						time = Math.round((365 / 12) * time);
						break;
				}

				// Если надо учитывать дополнительные платежи
				if(model.isAdditional){
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
							value = utils.toFloat(additional.value);
						if(additionalsHash[additionalTime]){
							additionalsHash[additionalTime] += value;
						}
						else {
							additionalsHash[additionalTime] = value;
						}
					}
				}

				model.totalAmount = result;
				for(i in additionalsHash){
					if(additionalsHash.hasOwnProperty(i)){
						model.totalAmount += additionalsHash[i];
					}
				}

				if(isCapitalize){
					// Если капитализация ежемесечная
					if(model.timeType == 0){
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
											resultAdditional += additional * (1 + days * percentsStep);
											currencyAdditional += utils.exchange(additional, startCourse) * (1 + days * currencyPercentStep);
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
								result += additional;
								currencyResult += utils.exchange(additional, startCourse);
							}
						}
					}
					else {
						for(i = 1; i <= time; i++){
							result += result * percentsStep;
							currencyResult += currencyResult * currencyPercentStep;
							additional = additionalsHash[i];
							if(additional){
								result += additional;
								currencyResult += utils.exchange(additional, startCourse);
							}
						}
					}

				}
				else {
					result *= 1 + percentsStep * time;
					currencyResult *= 1 + currencyPercentStep * time;
					if(additionalsHash){
						var additionalValue = 0;
						for(i in additionalsHash){
							if(additionalsHash.hasOwnProperty(i)){
								additionalTime = time - utils.toInt(i);
								if(additionalTime < 0 ){
									additionalTime = 0;
								}
								additionalValue += additionalsHash[i] * (1 + percentsStep * additionalTime);
							}
						}
						result += additionalValue;
						currencyResult += utils.exchange(additionalValue, startCourse);
					}
				}

				model.result = result.toFixed(2);
				model.endCourse = utils.toFloat(model.endCourse) ? model.endCourse : model.startCourse;
				model.criticCourse = utils.exchange(result, currencyResult);

				// Приведение к формату чисел
				for(var key in toDigit){
					if(toDigit.hasOwnProperty(key)){
						model[toDigit[key]] = utils.toDigit(model[toDigit[key]]);
					}
				}

				// Запись реузльтата расчета в память
				if(!noSetToBuffer){
					var depositsLength = utils.toInt(localStorage.getItem('depositsLength'));
					if(!depositsLength){
						depositsLength = 1;
					}
					else {
						depositsLength++;
					}
					if(depositsLength > MAX_SAVE_OF_DEPOSIT){
						localStorage.removeItem('deposit_1');
						for(i = 2; i <= MAX_SAVE_OF_DEPOSIT; i++){
							var item = localStorage.getItem('deposit_' + i);
							localStorage.setItem('deposit_' + (i-1), item);
						}
						depositsLength = MAX_SAVE_OF_DEPOSIT
					}
					localStorage.setItem('depositsLength', depositsLength);
					localStorage.setItem('deposit_' + depositsLength, JSON.stringify(model));
					$scope.setCalculation();
				}
			},

			isCanCalculate: function(){
				return utils.toFloat($scope.model.startValue)
			},

			isCanShowExchangeToStartValue: function(){
				return utils.toFloat($scope.model.startValue) && utils.toFloat($scope.model.startCourse);
			},

			showCalculation: function(){
				$scope.model = angular.extend({}, $scope.previousCalculation[this.$index]);
				$scope.calculateResult(null, true)
			},

			clearCalculations: function(){
				$scope.previousCalculation = [];
				localStorage.removeItem('depositsLength');
				for(var i = 0; i <= MAX_SAVE_OF_DEPOSIT; i++){
					localStorage.removeItem('deposit_' + i);
				}
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

			checkCurrentAdditional: function(){
				var additionals = $scope.model.additionals,
					currentAdditional = additionals[additionals.length - 1];
				return !!(utils.toFloat(currentAdditional.value) && utils.toFloat(currentAdditional.time));
			},

			addNewAdditional: function(){
				var additionals = $scope.model.additionals,
					currentAdditional = additionals[additionals.length - 1];
				// Запрет добавления нового поступления, если оно не было заполнено
				if(!$scope.checkCurrentAdditional()){
					return false;
				}
				// Добавление поступление и открытие нового поля для заполнения
				currentAdditional.isNew = false;
				additionals.push({
					value: 0,
					time: 0,
					timeType: currentAdditional.timeType,
					isNew: true
				})
			},

			removeAdditional: function($event){
				var target = $event.target ? $event.target : $event.srcElement,
					index;
				target = angular.element(target);
				index = utils.toInt(target.attr('data-index'));
				$scope.model.additionals.splice(index, 1);
			}
		});

		$scope.setCalculation();

	}]);

	angular.bootstrap(document.body, ['Deposit'])
});