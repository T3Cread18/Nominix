IF v_employee_id IS NULL THEN
                        INSERT INTO payroll_core_employee (
                            first_name, last_name, national_id, 
                            hire_date, is_active, 
                            branch_id, department_id, job_position_id, position,
                            bank_name, bank_account_number, bank_account_type,
                            created_at, updated_at
                        )
                        VALUES (
                            v_first_name, v_last_name, v_national_id,
                            r.fecha_ingreso, TRUE,
                            v_branch_id, v_dept_id, v_position_id, r.cargo,
                            r.banco, v_clean_account, r.tipo_cuenta,
                            NOW(), NOW()
                        )
                        RETURNING id INTO v_employee_id;
                        RAISE NOTICE 'Empleado creado: % (%)', r.nombre_completo, v_national_id;
                    ELSE
                        RAISE NOTICE 'Actualizando empleado: % (%)', r.nombre_completo, v_national_id;
                        UPDATE payroll_core_employee 
                        SET branch_id = v_branch_id, 
                            job_position_id = v_position_id, 
                            position = r.cargo,
                            hire_date = r.fecha_ingreso,
                            bank_name = r.banco,
                            bank_account_number = v_clean_account,
                            bank_account_type = r.tipo_cuenta
                        WHERE id = v_employee_id;
                    END IF;
                END;
                
                -- C. Crear/Actualizar Contrato
                IF NOT EXISTS (SELECT 1 FROM payroll_core_laborcontract WHERE employee_id = v_employee_id AND is_active = TRUE) THEN
                    INSERT INTO payroll_core_laborcontract (
                        employee_id, branch_id, job_position_id, position, department_id,
                        start_date, is_active, 
                        contract_type, payment_frequency,
                        salary_amount, salary_currency_id,
                        base_salary_bs, includes_cestaticket,
                        created_at, updated_at,
                        islr_retention_percentage
                    )
                    VALUES (
                        v_employee_id, v_branch_id, v_position_id, r.cargo, v_dept_id,
                        r.fecha_ingreso, TRUE,
                        'INDEFINITE', 'BIWEEKLY',
                        0, v_currency_id,
                        0, TRUE,
                        NOW(), NOW(),
                        0
                    );
                    RAISE NOTICE 'Contrato creado para: %', r.nombre_completo;
                ELSE
                    -- Actualizar fecha de inicio del contrato activo si es diferente
                    UPDATE payroll_core_laborcontract
                    SET start_date = r.fecha_ingreso
                    WHERE employee_id = v_employee_id AND is_active = TRUE AND start_date != r.fecha_ingreso;
                END IF;
            END;
        END;
        
    END LOOP;
    
END $$;