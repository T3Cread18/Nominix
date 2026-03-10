"""
Servicio de cálculo de depreciación de activos fijos.

Soporta tres métodos:
1. Línea Recta (Straight Line)
2. Saldos Decrecientes (Declining Balance)
3. Unidades de Producción (Units of Production)
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from dateutil.relativedelta import relativedelta

from assets.models import Asset, AssetDepreciation


class DepreciationService:
    """
    Calcula y registra la depreciación de activos fijos.
    """

    @classmethod
    def calculate(cls, asset, period_date=None, user=None, units_produced=None, total_units=None):
        """
        Calcula la depreciación de un activo para un período.
        
        Args:
            asset: Instancia de Asset
            period_date: Fecha del período (default: hoy)
            user: Usuario que ejecuta el cálculo
            units_produced: Unidades producidas (para método de unidades)
            total_units: Total de unidades estimadas (para método de unidades)
        
        Returns:
            AssetDepreciation: Registro creado, o None si no aplica
        """
        if period_date is None:
            period_date = date.today()

        # Validaciones
        if asset.status == 'DISPOSED':
            return None
        if asset.current_book_value <= asset.residual_value:
            return None  # Ya está totalmente depreciado

        # Verificar que no exista cálculo para este período
        if AssetDepreciation.objects.filter(asset=asset, period_date=period_date).exists():
            return None

        method = asset.depreciation_method
        book_value_before = asset.current_book_value

        if method == 'STRAIGHT_LINE':
            amount = cls._straight_line(asset)
        elif method == 'DECLINING_BALANCE':
            amount = cls._declining_balance(asset)
        elif method == 'UNITS_OF_PRODUCTION':
            amount = cls._units_of_production(asset, units_produced, total_units)
        else:
            amount = cls._straight_line(asset)

        # No depreciar por debajo del valor residual
        max_depreciation = book_value_before - asset.residual_value
        amount = min(amount, max_depreciation)

        if amount <= 0:
            return None

        book_value_after = book_value_before - amount

        # Crear registro
        record = AssetDepreciation.objects.create(
            asset=asset,
            period_date=period_date,
            method=method,
            depreciation_amount=amount,
            book_value_before=book_value_before,
            book_value_after=book_value_after,
            calculated_by=user,
        )

        # Actualizar valor en libros del activo
        asset.current_book_value = book_value_after
        asset.save(update_fields=['current_book_value', 'updated_at'])

        return record

    @classmethod
    def calculate_batch(cls, queryset=None, period_date=None, user=None):
        """
        Calcula depreciación para múltiples activos.
        
        Args:
            queryset: QuerySet de activos (default: todos los activos activos)
            period_date: Fecha del período
            user: Usuario
        
        Returns:
            dict: { 'processed': int, 'depreciated': int, 'skipped': int, 'total_amount': Decimal }
        """
        if queryset is None:
            queryset = Asset.objects.filter(status='ACTIVE')

        if period_date is None:
            period_date = date.today()

        processed = 0
        depreciated = 0
        skipped = 0
        total_amount = Decimal('0.00')

        for asset in queryset:
            processed += 1
            record = cls.calculate(asset, period_date=period_date, user=user)
            if record:
                depreciated += 1
                total_amount += record.depreciation_amount
            else:
                skipped += 1

        return {
            'processed': processed,
            'depreciated': depreciated,
            'skipped': skipped,
            'total_amount': float(total_amount),
        }

    @classmethod
    def get_schedule(cls, asset):
        """
        Genera una proyección del cronograma de depreciación completo.
        
        Returns:
            list[dict]: Proyección año por año
        """
        schedule = []
        book_value = Decimal(str(asset.acquisition_cost))
        residual = Decimal(str(asset.residual_value))
        annual_dep = cls._straight_line(asset)

        for year in range(1, asset.useful_life_years + 1):
            dep_amount = min(annual_dep, book_value - residual)
            if dep_amount <= 0:
                break
            book_value -= dep_amount
            schedule.append({
                'year': year,
                'depreciation': float(dep_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
                'accumulated': float((Decimal(str(asset.acquisition_cost)) - book_value).quantize(Decimal('0.01'))),
                'book_value': float(book_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
            })

        return schedule

    # ─── Métodos de cálculo ──────────────────────────

    @classmethod
    def _straight_line(cls, asset):
        """
        Línea recta: (Costo - Residual) / Vida útil
        Retorna el monto anual.
        """
        cost = Decimal(str(asset.acquisition_cost))
        residual = Decimal(str(asset.residual_value))
        life = asset.useful_life_years or 1
        annual = (cost - residual) / Decimal(str(life))
        return annual.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @classmethod
    def _declining_balance(cls, asset):
        """
        Saldos decrecientes: Valor en libros × (2 / Vida útil)
        Aplicado al valor actual en libros (doble del porcentaje de línea recta).
        """
        book_value = Decimal(str(asset.current_book_value))
        life = asset.useful_life_years or 1
        rate = Decimal('2') / Decimal(str(life))
        amount = book_value * rate
        return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @classmethod
    def _units_of_production(cls, asset, units_produced=None, total_units=None):
        """
        Unidades de producción: (Costo - Residual) × (Uso real / Uso total)
        """
        if not units_produced or not total_units:
            # Fallback a línea recta si no hay datos de producción
            return cls._straight_line(asset)

        cost = Decimal(str(asset.acquisition_cost))
        residual = Decimal(str(asset.residual_value))
        ratio = Decimal(str(units_produced)) / Decimal(str(total_units))
        amount = (cost - residual) * ratio
        return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
