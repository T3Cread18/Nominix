-- ============================================================
-- 1. SEDES (Branches)
-- ============================================================
INSERT INTO payroll_core_branch (name, code, address, phone, is_active, is_main, created_at, rif) VALUES
('Farmacia Los Yanez de Ospino',      'FLYO',     'Ospino, Portuguesa', '', true, false, NOW(), NULL),
('Farmacia Farmanostra Guanare',      'FFNG',     'Guanare, Portuguesa', '', true, false, NOW(), NULL),
('Corporativo',                        'CORP',     'Guanare, Portuguesa', '', true, true,  NOW(), NULL),
('Farmacia Los Llanos de Ospino',     'FLLO',     'Ospino, Portuguesa', '', true, false, NOW(), NULL),
('Farmacia Mamanico Ospino',          'FMAO',     'Ospino, Portuguesa', '', true, false, NOW(), NULL),
('Farmacia Mamanico Ospino Sucursal', 'FMAS',     'Ospino, Portuguesa', '', true, false, NOW(), NULL),
('Farmacias Pacheco (FARPACA)',       'FARP',     'Portuguesa', '', true, false, NOW(), NULL)
;

-- ============================================================
-- 2. DEPARTAMENTOS (uno genérico por sede)
-- ============================================================
INSERT INTO payroll_core_department (name, description, supervisor_id, branch_id) VALUES
('Operaciones',  'Departamento general', NULL, (SELECT id FROM payroll_core_branch WHERE code='FLYO')),
('Operaciones',  'Departamento general', NULL, (SELECT id FROM payroll_core_branch WHERE code='FFNG')),
('Corporativo',  'Departamento corporativo', NULL, (SELECT id FROM payroll_core_branch WHERE code='CORP')),
('Operaciones',  'Departamento general', NULL, (SELECT id FROM payroll_core_branch WHERE code='FLLO')),
('Operaciones',  'Departamento general', NULL, (SELECT id FROM payroll_core_branch WHERE code='FMAO')),
('Operaciones',  'Departamento general', NULL, (SELECT id FROM payroll_core_branch WHERE code='FMAS')),
('Operaciones',  'Departamento general', NULL, (SELECT id FROM payroll_core_branch WHERE code='FARP'))
;

-- ============================================================
-- 3. CARGOS (JobPosition) - uno por tipo de cargo, por departamento
-- Se usa el dept de la sede FLYO como referencia; 
-- los empleados se enlazan por job_position_id después.
-- Necesita currency_id - usamos 'USD' como default.
-- ============================================================

-- Primero verificar que existe la moneda USD:
-- SELECT id FROM payroll_core_currency WHERE code = 'USD';

INSERT INTO payroll_core_jobposition (name, code, description, department_id, default_total_salary, currency_id, split_fixed_amount, split_fixed_currency_id, is_active, created_at, updated_at) VALUES
('Coordinador Administrativo',  'COORD-ADM',   'Coordinación administrativa',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Cajero (a)',                   'CAJ-001',     'Cajero/a de farmacia',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Auxiliar de Almacen',          'AUX-ALM',     'Auxiliar de almacén',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Supervisor de Venta',          'SUP-VTA',     'Supervisor de ventas',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Supervisor de Almacen',        'SUP-ALM',     'Supervisor de almacén',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Gerente',                      'GER-001',     'Gerente de sucursal',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Farmacéutico',                 'FARM-001',    'Farmacéutico regente',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Promotor de Venta',            'PROM-VTA',    'Promotor de ventas',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Directivo',                    'DIR-001',     'Directivo / Accionista',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Chofer',                       'CHO-001',     'Chofer / Conductor',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Coordinador de Inventario',    'COORD-INV',   'Coordinación de inventario',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Coordinador Financiero',       'COORD-FIN',   'Coordinación financiera',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Coordinador de Compras',       'COORD-COM',   'Coordinación de compras',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Especialista de RRHH',         'ESP-RRHH',    'Especialista de recursos humanos',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Coordinador Cuentas por Pagar','COORD-CXP',   'Coordinación cuentas por pagar',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Especialista de Inventario',   'ESP-INV',     'Especialista de inventario',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW()),

('Analista de Tesorería',        'ANA-TES',     'Analista de tesorería',
  (SELECT id FROM payroll_core_department WHERE branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP') LIMIT 1),
  0.00, 'USD', 0.00, 'USD', true, NOW(), NOW())
;

-- ============================================================
-- 4. ASIGNAR SEDE (branch_id) A CADA EMPLEADO
-- ============================================================

-- Farmacia Los Yanez de Ospino
UPDATE payroll_core_employee SET branch_id = (SELECT id FROM payroll_core_branch WHERE code='FLYO')
WHERE national_id IN (
  'V-15906403','V-30329814','V-31272373','V-19031701','V-12647713',
  'V-13329198','V-27938750','V-25016178','V-28427378','V-29632132',
  'V-26940897','V-18251792','V-30240358','V-29632180','V-12240534',
  'V-28106592','V-27277274'
);

-- Farmacia Farmanostra Guanare
UPDATE payroll_core_employee SET branch_id = (SELECT id FROM payroll_core_branch WHERE code='FFNG')
WHERE national_id IN (
  'V-15237079','V-24616618','V-15886645','V-31202590','V-25162417',
  'V-20544667','V-15445083','V-17049673','V-31054058','V-10052314'
);

-- Corporativo
UPDATE payroll_core_employee SET branch_id = (SELECT id FROM payroll_core_branch WHERE code='CORP')
WHERE national_id IN (
  'V-18102594','V-30074456','V-20643419','V-14271963','V-20271643',
  'V-13038433','V-19678992','V-17363079','V-29919196','V-25956343',
  'V-21135632'
);

-- Farmacia Los Llanos de Ospino
UPDATE payroll_core_employee SET branch_id = (SELECT id FROM payroll_core_branch WHERE code='FLLO')
WHERE national_id IN (
  'V-16520363','V-18224805','V-24807692','V-26705934','V-15399781',
  'V-17616649','V-21562526','V-23485080','V-12647918','V-18101843',
  'V-13534905','V-17362211','V-18891102'
);

-- Farmacia Mamanico Ospino
UPDATE payroll_core_employee SET branch_id = (SELECT id FROM payroll_core_branch WHERE code='FMAO')
WHERE national_id IN (
  'V-24320202','V-19376483','V-10638320','V-27277686','V-23032373',
  'V-22988948','V-10143962','V-12265596','V-15070132','V-12264327',
  'V-15492244'
);

-- Farmacia Mamanico Ospino Sucursal
UPDATE payroll_core_employee SET branch_id = (SELECT id FROM payroll_core_branch WHERE code='FMAS')
WHERE national_id IN (
  'V-12236585','V-9255941','V-29632098','V-26151681','V-13486066',
  'V-23551673','V-18893944','V-32489512','V-31812734'
);

-- Farmacias Pacheco (FARPACA)
UPDATE payroll_core_employee SET branch_id = (SELECT id FROM payroll_core_branch WHERE code='FARP')
WHERE national_id IN (
  'V-20544905','V-16072175','V-10726140','V-12238203','V-27102918',
  'V-4138739','V-12240037'
);

-- ============================================================
-- 5. ASIGNAR CARGO (job_position_id) A CADA EMPLEADO
-- ============================================================

-- Coordinador Administrativo
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='COORD-ADM')
WHERE position IN ('COORD. ADMINISTRATIVO');

-- Cajero (a)
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='CAJ-001')
WHERE position IN ('CAJERO (A)');

-- Auxiliar de Almacen
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='AUX-ALM')
WHERE position IN ('AUX. DE ALMACEN');

-- Supervisor de Venta
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='SUP-VTA')
WHERE position IN ('SUP. DE VENTA');

-- Supervisor de Almacen
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='SUP-ALM')
WHERE position IN ('SUP. DE ALMACEN');

-- Gerente
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='GER-001')
WHERE position IN ('GERENTE');

-- Farmacéutico
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='FARM-001')
WHERE position IN ('FARMACEUTICO');

-- Promotor de Venta
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='PROM-VTA')
WHERE position IN ('PROMOTOR DE VENTA');

-- Directivo
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='DIR-001')
WHERE position IN ('DIRECTIVO');

-- Chofer
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='CHO-001')
WHERE position IN ('CHOFER');

-- Coordinador de Inventario
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='COORD-INV')
WHERE position IN ('COORD. DE INVENTARIO');

-- Coordinador Financiero
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='COORD-FIN')
WHERE position IN ('COORD. FINANCIERO');

-- Coordinador de Compras
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='COORD-COM')
WHERE position IN ('COORD. DE COMPRAS');

-- Especialista de RRHH
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='ESP-RRHH')
WHERE position IN ('ESPECIALISTA DE RRHH');

-- Coordinador Cuentas por Pagar
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='COORD-CXP')
WHERE position IN ('COORD. CUENTAS POR PAGAR');

-- Especialista de Inventario
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='ESP-INV')
WHERE position IN ('ESPECIALISTA DE INVENTARIO');

-- Analista de Tesorería
UPDATE payroll_core_employee SET job_position_id = (SELECT id FROM payroll_core_jobposition WHERE code='ANA-TES')
WHERE position IN ('ANALISTA DE TESORERIA');

-- ============================================================
-- 6. ASIGNAR DEPARTAMENTO (department_id) según branch del empleado
-- ============================================================
UPDATE payroll_core_employee e
SET department_id = d.id
FROM payroll_core_department d
WHERE d.branch_id = e.branch_id
  AND e.department_id IS NULL;

-- ============================================================
-- RESUMEN:
-- 7 Sedes creadas
-- 7 Departamentos creados (uno por sede)
-- 17 Cargos creados
-- 78 Empleados actualizados con branch_id, job_position_id, department_id
-- ============================================================
