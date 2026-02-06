import { addDays, isWeekend, isSameDay, format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calcula la fecha de retorno al trabajo después de las vacaciones.
 * Salta fines de semana (Sábado/Domingo) y feriados.
 * 
 * @param {Date|string} startDate - Fecha de inicio de las vacaciones
 * @param {number} days - Número de días hábiles a disfrutar
 * @param {Array<Date|string>} holidaysArray - Lista de fechas de feriados
 * @returns {Date} - Fecha de retorno al trabajo
 * 
 * @example
 * const returnDate = calculateReturnDate(new Date('2024-01-15'), 5, [new Date('2024-01-19')]);
 */
export const calculateReturnDate = (startDate, days, holidaysArray = []) => {
    if (!startDate || !days || days <= 0) {
        return null;
    }

    // Normalizar la fecha de inicio
    const start = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate);

    // Normalizar el array de feriados
    const holidays = holidaysArray.map(h =>
        typeof h === 'string' ? parseISO(h) : new Date(h)
    );

    // Función para verificar si una fecha es feriado
    const isHoliday = (date) => {
        return holidays.some(holiday => isSameDay(date, holiday));
    };

    // Función para verificar si es un día hábil
    const isBusinessDay = (date) => {
        return !isWeekend(date) && !isHoliday(date);
    };

    let currentDate = start;
    let businessDaysCount = 0;

    // Contar días hábiles hasta llegar al número solicitado
    while (businessDaysCount < days) {
        if (isBusinessDay(currentDate)) {
            businessDaysCount++;
        }
        if (businessDaysCount < days) {
            currentDate = addDays(currentDate, 1);
        }
    }

    // La fecha de retorno es el siguiente día hábil después del último día de vacaciones
    let returnDate = addDays(currentDate, 1);
    while (!isBusinessDay(returnDate)) {
        returnDate = addDays(returnDate, 1);
    }

    return returnDate;
};

/**
 * Calcula la fecha de fin de las vacaciones (último día de vacaciones).
 * 
 * @param {Date|string} startDate - Fecha de inicio
 * @param {number} days - Días a disfrutar
 * @param {Array} holidaysArray - Feriados
 * @returns {Date} - Fecha del último día de vacaciones
 */
export const calculateEndDate = (startDate, days, holidaysArray = []) => {
    if (!startDate || !days || days <= 0) {
        return null;
    }

    const start = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate);

    const holidays = holidaysArray.map(h =>
        typeof h === 'string' ? parseISO(h) : new Date(h)
    );

    const isHoliday = (date) => {
        return holidays.some(holiday => isSameDay(date, holiday));
    };

    const isBusinessDay = (date) => {
        return !isWeekend(date) && !isHoliday(date);
    };

    let currentDate = start;
    let businessDaysCount = 0;

    while (businessDaysCount < days) {
        if (isBusinessDay(currentDate)) {
            businessDaysCount++;
        }
        if (businessDaysCount < days) {
            currentDate = addDays(currentDate, 1);
        }
    }

    return currentDate;
};

/**
 * Verifica si una fecha es un día hábil.
 * 
 * @param {Date|string} date - Fecha a verificar
 * @param {Array} holidaysArray - Lista de feriados
 * @returns {boolean} - true si es día hábil
 */
export const isBusinessDay = (date, holidaysArray = []) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);

    if (isWeekend(dateObj)) {
        return false;
    }

    const holidays = holidaysArray.map(h =>
        typeof h === 'string' ? parseISO(h) : new Date(h)
    );

    return !holidays.some(holiday => isSameDay(dateObj, holiday));
};

/**
 * Obtiene el tipo de día no hábil.
 * 
 * @param {Date|string} date - Fecha a verificar
 * @param {Array} holidaysArray - Lista de feriados
 * @returns {string|null} - 'weekend', 'holiday', o null si es hábil
 */
export const getNonBusinessDayType = (date, holidaysArray = []) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);

    if (isWeekend(dateObj)) {
        return dateObj.getDay() === 0 ? 'domingo' : 'sábado';
    }

    const holidays = holidaysArray.map(h =>
        typeof h === 'string' ? parseISO(h) : new Date(h)
    );

    if (holidays.some(holiday => isSameDay(dateObj, holiday))) {
        return 'feriado';
    }

    return null;
};

/**
 * Formatea una fecha para mostrar.
 * 
 * @param {Date|string} date - Fecha a formatear
 * @param {string} formatStr - Formato de salida (default: 'dd/MM/yyyy')
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    return format(dateObj, formatStr, { locale: es });
};

/**
 * Formatea una fecha con nombre del día y mes.
 * 
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Ej: "Lunes, 15 de Enero de 2024"
 */
export const formatDateLong = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    return format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
};

/**
 * Calcula los años de antigüedad desde la fecha de ingreso.
 * 
 * @param {Date|string} hireDate - Fecha de ingreso
 * @returns {number} - Años de antigüedad
 */
export const calculateYearsOfService = (hireDate) => {
    if (!hireDate) return 0;
    const hireDateObj = typeof hireDate === 'string' ? parseISO(hireDate) : new Date(hireDate);
    return differenceInYears(new Date(), hireDateObj);
};

/**
 * Formatea un monto en bolívares.
 * 
 * @param {number} amount - Monto a formatear
 * @returns {string} - Monto formateado con separadores
 */
export const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return 'Bs. 0,00';
    return `Bs. ${Number(amount).toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};
