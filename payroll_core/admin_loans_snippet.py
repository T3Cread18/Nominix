
@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    """
    Administrador de Préstamos.
    """
    list_display = (
        'employee', 
        'description', 
        'formatted_amount', 
        'formatted_balance', 
        'installment_amount',
        'status_display'
    )
    list_filter = ('status', 'currency', 'frequency')
    search_fields = ('employee__national_id', 'employee__first_name', 'employee__last_name', 'description')
    autocomplete_fields = ['employee']
    
    def formatted_amount(self, obj):
        return f"{obj.currency.symbol} {obj.amount:,.2f}"
    formatted_amount.short_description = 'Monto Total'
    
    def formatted_balance(self, obj):
        return f"{obj.currency.symbol} {obj.balance:,.2f}"
    formatted_balance.short_description = 'Saldo'

    def status_display(self, obj):
        colors = {
            'DRAFT': 'gray',
            'APPROVED': 'blue',
            'ACTIVE': 'green',
            'PAID': 'black',
            'CANCELLED': 'red'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    status_display.short_description = 'Estado'


@admin.register(LoanPayment)
class LoanPaymentAdmin(admin.ModelAdmin):
    """
    Administrador de Pagos de Préstamos.
    """
    list_display = ('loan', 'amount', 'payment_date', 'reference', 'payslip')
    list_filter = ('payment_date',)
    search_fields = ('loan__employee__national_id', 'reference')
    date_hierarchy = 'payment_date'
