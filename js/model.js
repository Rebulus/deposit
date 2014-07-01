define(['angular', 'utils'], function(angular) {
	angular.module('Deposit.Models', ['Deposit.Utils'])
		.factory('model', ['utils', function(utils) {
			// Максимальное колличество сохраняемых депозитов
			var MAX_SAVE_OF_DEPOSIT = 5;
			// Обертка над стандартных localStorage для учета его существования или
			// переполнения
			var emptyFunction = function(){};
			var fakeLocalStorage = {
				setItem: emptyFunction,
				getItem: emptyFunction,
				removeItem: emptyFunction,
				clear: emptyFunction
			};
			var localStorage = (function(){
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
			})();

			return {
				current: {
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
						course: 0,
						value: 0,
						time: 0,
						timeType: 0,
						isNew: true
					}]
				},

				previous: [],

				// Методы модели

				// Сохранение текущего расчета в LocalStorage
				save: function() {
					var depositsLength = utils.toInt(localStorage.getItem('depositsLength'));
					if(!depositsLength){
						depositsLength = 1;
					}
					else {
						depositsLength++;
					}
					if(depositsLength > MAX_SAVE_OF_DEPOSIT){
						localStorage.removeItem('deposit_1');
						for(var i = 2; i <= MAX_SAVE_OF_DEPOSIT; i++){
							var item = localStorage.getItem('deposit_' + i);
							var itemIndex = i - 1;
							localStorage.setItem('deposit_' + itemIndex, item);
						}
						depositsLength = MAX_SAVE_OF_DEPOSIT
					}
					localStorage.setItem('depositsLength', depositsLength);
					localStorage.setItem('deposit_' + depositsLength, JSON.stringify(this.current));
				},

				// Получение предыдущих расчетов депозитов из LocalStorage
				fetch: function () {
					var depositsLength = utils.toInt(localStorage.getItem('depositsLength'));
					if(depositsLength){
						this.previous = [];
						for(var i = 1; i <= depositsLength; i++){
							var depositItem = localStorage.getItem('deposit_' + i);
							depositItem = JSON.parse(depositItem);
							this.previous.push(depositItem);
						}
					}
				},

				// Очистка предыдущих расчетов депозитов
				clear: function() {
					this.previous = [];
					localStorage.removeItem('depositsLength');
					for(var i = 0; i <= MAX_SAVE_OF_DEPOSIT; i++){
						localStorage.removeItem('deposit_' + i);
					}
				}
			};
		}]);
});
