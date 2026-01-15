from django.db import transaction
from decimal import Decimal
from ..models import (
    PayrollReceipt, PayrollReceiptLine, Loan, LoanPayment, 
    LaborContract, PayrollPeriod
)

class PayrollPersistenceService:
    """
    Servicio especializado en la persistencia de resultados de nómina.
    Garantiza inmutabilidad histórica mediante snapshots y logs de cálculo.
    """

    @staticmethod
    @transaction.atomic
    def save_payroll_calculation(contract: LaborContract, period: PayrollPeriod, calculation_result: dict, user=None):
        """
        Guarda los resultados del motor de nómina en la base de datos.
        
        Args:
            contract: Instancia del contrato del empleado.
            period: Periodo de nómina relacionado.
            calculation_result: Salida del método calculate_payroll() del motor.
            user: Usuario que realiza la acción (opcional).
        """
        totals = calculation_result.get('totals', {})
        results_lines = calculation_result.get('lines', [])
        exchange_rate = calculation_result.get('exchange_rate_used', Decimal('1.00'))

        # 1. Crear Snapshot del contrato
        contract_snapshot = {
            'position': contract.position,
            'job_position': contract.job_position.name if contract.job_position else contract.position,
            'department': contract.department.name if contract.department else None,
            'branch': contract.branch.name if contract.branch else None,
            'salary_amount': str(contract.salary_amount),
            'salary_currency': contract.salary_currency.code,
            'base_salary_bs': str(contract.base_salary_bs),
            'payment_frequency': contract.payment_frequency,
        }

        # 2. Crear Cabecera del Recibo (Snapshot de montos y tipos)
        receipt = PayrollReceipt.objects.create(
            period=period,
            employee=contract.employee,
            contract_snapshot=contract_snapshot,
            salary_base_snapshot=contract.salary_amount,
            total_income_ves=totals.get('income_ves', Decimal('0.00')),
            total_deductions_ves=totals.get('deductions_ves', Decimal('0.00')),
            net_pay_ves=totals.get('net_pay_ves', Decimal('0.00')),
            exchange_rate_snapshot=exchange_rate,
            currency_code='VES', # Moneda legal base
            status=PayrollReceipt.ReceiptStatus.DRAFT
        )

        # 3. Crear Líneas de Detalle
        detail_objs = []
        for line in results_lines:
            # Capturar logs de cálculo del motor
            calc_log = {
                'trace': line.get('trace', ''),
                'formula': line.get('formula', ''),
                'variables': line.get('variables', {})
            }

            # Determinar si tiene incidencia salarial (basado en el código o metadatos)
            # Nota: Esto podría venir directamente de la configuración del concepto en DB
            is_incidence = line.get('is_salary_incidence', False)

            detail_objs.append(
                PayrollReceiptLine(
                    receipt=receipt,
                    concept_code=line['code'],
                    concept_name=line['name'],
                    kind=line['kind'],
                    amount_ves=line['amount_ves'],
                    tipo_recibo=line.get('tipo_recibo', 'salario'),
                    quantity=line.get('quantity', 0) or 0,
                    unit=line.get('unit', 'días'),
                    percentage=line.get('percentage', 0) or 0,
                    calculation_log=calc_log,
                    is_salary_incidence=is_incidence,
                    # Referencial en moneda origen
                    amount_src=(line['amount_ves'] / exchange_rate).quantize(Decimal('0.01')) if exchange_rate > 0 else 0
                )
            )

            # 4. Amortización de Préstamos (Cuentas por Cobrar)
            if line.get('code') == 'LOAN' and line.get('loan_id'):
                try:
                    loan = Loan.objects.select_for_update().get(id=line['loan_id'])
                    
                    # El monto del descuento en VES debemos convertirlo a la moneda del préstamo
                    payment_amount_ves = line['amount_ves']
                    payment_amount_loan_curr = payment_amount_ves
                    
                    if loan.currency.code != 'VES':
                        # Usamos la tasa del recibo
                        payment_amount_loan_curr = (payment_amount_ves / exchange_rate).quantize(Decimal('0.01'))

                    # Crear registro de abono
                    LoanPayment.objects.create(
                        loan=loan,
                        receipt=receipt,
                        amount=payment_amount_loan_curr,
                        payment_date=receipt.period.payment_date,
                        exchange_rate_applied=exchange_rate if loan.currency.code != 'VES' else Decimal('1.00'),
                        reference=f"Deducción Nómina {receipt.period.name}"
                    )

                    # Actualizar Saldo
                    loan.balance -= payment_amount_loan_curr
                    if loan.balance <= Decimal('0.01'):
                        loan.balance = Decimal('0.00')
                        loan.status = Loan.LoanStatus.Paid
                    
                    loan.save()
                except Loan.DoesNotExist:
                    pass

        # Persistir todas las líneas en una sola operación
        PayrollReceiptLine.objects.bulk_create(detail_objs)

        return receipt
