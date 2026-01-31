"""
Servicio para gestionar el Pago Anticipado de Vacaciones.
Genera el cálculo, crea el préstamo (deuda) y emite el recibo.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from payroll_core.models import (
    Employee, 
    PayrollPeriod, 
    PayrollReceipt, 
    PayrollReceiptLine,
    Loan,
    VacationBalance,
    PayrollConcept,
    ExchangeRate,
    Company
)

class VacationAdvanceService:
    @staticmethod
    @transaction.atomic
    def generate_advance_payment(vacation_balance, process_date=None, user=None):
        """
        Genera un pago anticipado de vacaciones.
        """
        # Importar aquí para evitar ciclos
        from payroll_core.services.salary import SalarySplitter
        
        if not process_date:
            process_date = timezone.now().date()
            
        employee = vacation_balance.employee
        contract = vacation_balance.contract
        
        # 1. Determinar Periodo y Tasa
        print("DEBUG: Finding Period...")
        
        current_period = PayrollPeriod.objects.filter(
            status=PayrollPeriod.Status.OPEN
        ).first()
        
        if not current_period:
            current_period = PayrollPeriod.objects.order_by('-end_date').first()
            
        if not current_period:
             raise ValueError("No hay periodos de nómina definidos.")
        
        print(f"DEBUG: Period: {current_period.id}")

        rate = Decimal('1.0')
        if contract.salary_currency.code != 'VES':
             rate_obj = ExchangeRate.objects.filter(
                 currency=contract.salary_currency,
                 date_valid__lte=process_date
             ).order_by('-date_valid').first()
             
             if rate_obj:
                 rate = rate_obj.rate
        
        print(f"DEBUG: Rate: {rate}")

        # 2. Calcular Base Salarial usando SalarySplitter
        print(f"DEBUG: Calling SalarySplitter with contract={contract.id}, rate={rate}")
        breakdown = SalarySplitter.get_salary_breakdown(contract, exchange_rate=rate)
        print(f"DEBUG: SalarySplitter returned: {breakdown}")
        
        # Usamos el salario TOTAL (Base + Complemento) convertidos a VES
        monthly_salary_ves = breakdown['total'] * rate
        if 'base_ves_protected' in breakdown:
             # Si hay protección, usamos el valor protegido + complemento * tasa
             monthly_salary_ves = breakdown['base_ves_protected'] + (breakdown['complement'] * rate)

        daily_salary = monthly_salary_ves / Decimal('30')
        print(f"DEBUG: Daily Salary VES: {daily_salary}")
        
        # Días a pagar
        vac_days = vacation_balance.entitled_vacation_days
        bonus_days = vacation_balance.entitled_bonus_days if not vacation_balance.bonus_paid else 0
        
        vacation_amount = daily_salary * Decimal(vac_days)
        bonus_amount = daily_salary * Decimal(bonus_days)
        total_pay = vacation_amount + bonus_amount
        
        if total_pay <= 0:
            raise ValueError("El monto a pagar es 0. Verifique los días disponibles.")
        
        # Check for existing advance for this balance
        existing_loan = Loan.objects.filter(
            vacation_balance=vacation_balance, 
            loan_type=Loan.LoanType.VACATION_ADVANCE
        ).first()
        
        if existing_loan:
            raise ValueError(f"Ya existe un anticipo para este periodo de vacaciones (Préstamo #{existing_loan.id}).")
        
        # Check for existing receipt in current period (unique constraint)
        existing_receipt = PayrollReceipt.objects.filter(
            period=current_period,
            employee=employee
        ).first()
        
        if existing_receipt:
            raise ValueError(f"Ya existe un recibo para el empleado en este periodo (Recibo #{existing_receipt.id}). Use un periodo diferente o elimine el recibo existente.")
            
        # 3. Crear Recibo (PayrollReceipt)
        print("DEBUG: Creating Receipt...")
        receipt = PayrollReceipt.objects.create(
            period=current_period,
            employee=employee,
            contract_snapshot={
                'id': contract.id,
                'position': str(contract.job_position or contract.position),
                'salary': float(contract.base_salary_bs) if hasattr(contract, 'base_salary_bs') else 0.0,
                'currency': contract.salary_currency.code
            },
            net_pay_ves=total_pay,
            status=PayrollReceipt.ReceiptStatus.PAID,
            exchange_rate_snapshot=rate
        )
        
        # Crear Líneas del Recibo
        if vac_days > 0:
            PayrollReceiptLine.objects.create(
                receipt=receipt,
                concept_code='VACACIONES_DISFRUTE',
                concept_name='Días de Vacaciones (Anticipo)',
                kind=PayrollConcept.ConceptKind.EARNING,
                amount_ves=vacation_amount,
                quantity=vac_days,
                tipo_recibo='vacaciones'
            )

        if bonus_days > 0:
            PayrollReceiptLine.objects.create(
                receipt=receipt,
                concept_code='BONO_VACACIONAL',
                concept_name='Bono Vacacional',
                kind=PayrollConcept.ConceptKind.EARNING,
                amount_ves=bonus_amount,
                quantity=bonus_days,
                tipo_recibo='vacaciones'
            )
            
            # Marcar bono como pagado
            vacation_balance.bonus_paid = True
            vacation_balance.save()

        # Actualizar totales Recibo
        receipt.total_income_ves = total_pay
        # receipt.total_income_vacaciones es computed property
        # receipt.net_pay_vacaciones es computed property
        receipt.net_pay_ves = total_pay
        receipt.save()
        
        # 4. Crear Préstamo (Loan) tipo VACATION_ADVANCE
        loan = Loan.objects.create(
            employee=employee,
            description=f"Anticipo Vacaciones Periodo {vacation_balance.period_start.year}",
            amount=total_pay, # Monto en moneda del préstamo
            # OJO: Loan espera amount en su currency. Si contract es USD, total_pay (VES) debe ser convertido a USD?
            # Si Loan.currency es USD, amount debe ser USD.
            # VACATION_ADVANCE: Si pagamos en VES, deberíamos crear Loan en VES?
            # O convertir de vuelta a USD?
            # Engine convierte USD a VES.
            # Mejor usar moneda del contrato.
            currency=contract.salary_currency,
            loan_type=Loan.LoanType.VACATION_ADVANCE,
            vacation_balance=vacation_balance,
            status=Loan.LoanStatus.Active,
            start_date=process_date,
            balance=total_pay if contract.salary_currency.code == 'VES' else (total_pay / rate),
            frequency=Loan.Frequency.ALL_PAYROLLS,
            installment_amount=total_pay if contract.salary_currency.code == 'VES' else (total_pay / rate)
        )
        
        # Ajustar monto del Loan si es divisa
        if contract.salary_currency.code != 'VES':
             loan.amount = total_pay / rate
             loan.balance = loan.amount
             loan.installment_amount = loan.amount
             loan.save()
        
        return {
            'receipt': receipt,
            'loan': loan,
            'total_amount': total_pay
        }
