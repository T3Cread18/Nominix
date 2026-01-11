-- SQL para insertar los conceptos analizados del Excel
-- Asume que la moneda con ID 1 es Bolívares (VES), o ajusta el subselect.

BEGIN;

-- 1. DIAS DE DESCANSO (Prorrateo)
-- Excel: (Ingresos/11)*DiasDescanso. Simplificado a Valor Diario * Dias
-- Se asume entrada manual de variable 'DIAS_DESCANSO'
INSERT INTO payroll_core_payrollconcept 
(code, name, kind, computation_method, value, currency_id, is_salary_incidence, active, show_on_payslip, created_at, formula)
VALUES 
('DIAS_DESCANSO', 'Días de Descanso', 'EARNING', 'DYNAMIC_FORMULA', 0.00, (SELECT id FROM payroll_core_currency WHERE code='VES' LIMIT 1), true, true, true, NOW(), 'SALARIO_DIARIO * DIAS_DESCANSO');

-- 2. DESCANSO / FERIADO LABORADO
-- Excel: Cant * Diario * 1.5
INSERT INTO payroll_core_payrollconcept 
(code, name, kind, computation_method, value, currency_id, is_salary_incidence, active, show_on_payslip, created_at, formula)
VALUES 
('FERIADO_LAB', 'Descanso / Feriado Laborado', 'EARNING', 'DYNAMIC_FORMULA', 0.00, (SELECT id FROM payroll_core_currency WHERE code='VES' LIMIT 1), true, true, true, NOW(), 'SALARIO_DIARIO * 1.5 * FERIADOS_TRABAJADOS');

-- 3. REPOSO 100%
-- Excel: Dias * Diario
INSERT INTO payroll_core_payrollconcept 
(code, name, kind, computation_method, value, currency_id, is_salary_incidence, active, show_on_payslip, created_at, formula)
VALUES 
('REPOSO_100', 'Reposo 100%', 'EARNING', 'DYNAMIC_FORMULA', 0.00, (SELECT id FROM payroll_core_currency WHERE code='VES' LIMIT 1), true, true, true, NOW(), 'SALARIO_DIARIO * DIAS_REPOSO_100');

-- 4. REPOSO 33% (Pago)
-- Excel: Dias * (Diario * 0.3333)
INSERT INTO payroll_core_payrollconcept 
(code, name, kind, computation_method, value, currency_id, is_salary_incidence, active, show_on_payslip, created_at, formula)
VALUES 
('REPOSO_33', 'Reposo 33.33%', 'EARNING', 'DYNAMIC_FORMULA', 0.00, (SELECT id FROM payroll_core_currency WHERE code='VES' LIMIT 1), true, true, true, NOW(), 'SALARIO_DIARIO * 0.3333 * DIAS_REPOSO_33');

-- 5. HORAS EXTRAS DIURNA
-- Excel: Hora * Cant * 1.5
INSERT INTO payroll_core_payrollconcept 
(code, name, kind, computation_method, value, currency_id, is_salary_incidence, active, show_on_payslip, created_at, formula)
VALUES 
('H_EXTRA_DIU', 'Horas Extras Diurnas', 'EARNING', 'DYNAMIC_FORMULA', 0.00, (SELECT id FROM payroll_core_currency WHERE code='VES' LIMIT 1), true, true, true, NOW(), '(SALARIO_DIARIO / 8) * 1.5 * OVERTIME_HOURS');

-- 6. BONO NOCTURNO
-- Excel: (Hora * Cant) * 0.30
INSERT INTO payroll_core_payrollconcept 
(code, name, kind, computation_method, value, currency_id, is_salary_incidence, active, show_on_payslip, created_at, formula)
VALUES 
('B_NOCTURNO', 'Bono Nocturno', 'EARNING', 'DYNAMIC_FORMULA', 0.00, (SELECT id FROM payroll_core_currency WHERE code='VES' LIMIT 1), true, true, true, NOW(), '(SALARIO_DIARIO / 8) * 0.30 * NIGHT_HOURS');

-- 7. BONIFICACION DEL MES (Placeholder)
INSERT INTO payroll_core_payrollconcept 
(code, name, kind, computation_method, value, currency_id, is_salary_incidence, active, show_on_payslip, created_at, formula)
VALUES 
('BONIFICACION', 'Bonificación del Mes', 'EARNING', 'FIXED_AMOUNT', 0.00, (SELECT id FROM payroll_core_currency WHERE code='VES' LIMIT 1), true, true, true, NOW(), NULL);

COMMIT;
