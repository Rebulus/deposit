define(function(){
	var spacePattern = /\s+/g;

	return {
		/**
		 * Приводит передаваемое значение к десятичному числу.
		 * @param val передаваемое значение
		 * @param {String} [type='float'] тип дестичного числа, к которому происходит приведение
		 * @returns {Number} возвращает число, которое получилось при приведении. Если корректного
		 * приведения не получилось, возвращает 0
		 */
		toNumber: function(val, type){
			if(typeof val == 'number' && !isNaN(val)){
				if(type == 'int'){
					val = Math.floor(val);
				}
				return val;
			}
			// Приведение к строке и убирание пробелов
			val += '';
			spacePattern.lastIndex = 0;
			val = val.replace(spacePattern, '');

			if(type == 'int'){
				val = parseInt(val, 10);
			}
			else {
				val = parseFloat(val);
			}

			return isNaN(val) ? 0 : val;
		},
		/**
		 * Приведение значение к целому десятичному числу
		 * @param val значение, которое необходимо преобразовать
		 * @returns {Number} результирующее число
		 */
		toInt: function(val){
			return this.toNumber(val, 'int');
		},
		/**
		 * Приведение значение к вещественному десятичному числу
		 * @param val значение, которое необходимо преобразовать
		 * @returns {Number} результирующее число
		 */
		toFloat: function(val){
			return this.toNumber(val, 'float');
		},
		/**
		 * Преобразование валюты по установленному курсу
		 * @param val значение валюты
		 * @param course курс преобразования
		 * @returns {Number} результат преобразования. Если оба значения были не числами, то результат - 0
		 * Результат округляется до 2-й цифры после запятой
		 */
		exchange: function(val, course){
			var result = 0;
			course = this.toFloat(course);
			if(course){
				result = val / this.toFloat(course);
			}
			return this.toFloat(result.toFixed(2));
		},
		/**
		 * Деление переданного числа по разрядам
		 * @param value преобразуемое число
		 * @returns {String} результат преобразования
		 */
		toDigit: function(value){
			value = this.toFloat(value) + '';
			value = value.split('.');
			var add,
				result = '',
				number = value[0],
				start = number.length % 3; //количество цифр не входящих в триаду
			result += number.substr(0, start); //вставляем их сначала
			add = !result ? '' : ' '; //если число кратно 3, то не нужен первый пробел
			for (var i = start; i < number.length - 2; i += 3){
				result += add + number.substr(i, 3);
				add=' ';
			}
			return result + (value[1] ? '.' + value[1] : '');
		},
		/**
		 * Перевод месяцев в дни
		 */
		monthToDay: function(month){
			month = this.toFloat(month);
			return Math.round((365 / 12) * month);
		}
	}
});