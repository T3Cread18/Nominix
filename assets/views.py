"""
Views para el módulo de Activos Fijos.
"""
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    AssetCategory,
    Warehouse,
    Asset,
    AssetPhoto,
    AssetInvoice,
    AssetMovement,
    AssetDepreciation,
    AssetAudit,
    AssetAuditItem,
)
from .serializers import (
    AssetCategorySerializer,
    WarehouseSerializer,
    AssetListSerializer,
    AssetDetailSerializer,
    AssetPhotoSerializer,
    AssetInvoiceSerializer,
    AssetMovementSerializer,
    AssetDepreciationSerializer,
    AssetAuditSerializer,
    AssetAuditItemSerializer,
)


# ─── Categorías ──────────────────────────
class AssetCategoryViewSet(viewsets.ModelViewSet):
    """CRUD para categorías de activos."""
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


# ─── Almacenes ──────────────────────────
class WarehouseViewSet(viewsets.ModelViewSet):
    """CRUD para almacenes por sede."""
    queryset = Warehouse.objects.select_related('branch').all()
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['branch', 'is_active']
    search_fields = ['name']


# ─── Facturas ──────────────────────────
class AssetInvoiceViewSet(viewsets.ModelViewSet):
    """CRUD para facturas de adquisición."""
    queryset = AssetInvoice.objects.all()
    serializer_class = AssetInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['currency']
    search_fields = ['invoice_number', 'vendor_name']


# ─── Activos Fijos ──────────────────────────
class AssetViewSet(viewsets.ModelViewSet):
    """
    CRUD principal para activos fijos.
    Listado usa un serializer ligero, detalle usa el completo.
    """
    queryset = Asset.objects.select_related(
        'category', 'warehouse', 'warehouse__branch', 'custodian', 'invoice'
    ).prefetch_related('photos').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'warehouse', 'status', 'warehouse__branch']
    search_fields = ['code', 'name', 'serial_number', 'brand', 'barcode']
    ordering_fields = ['name', 'acquisition_date', 'current_book_value', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return AssetListSerializer
        return AssetDetailSerializer

    @action(detail=True, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request, pk=None):
        """Subir una foto para un activo."""
        asset = self.get_object()
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Se requiere una imagen'}, status=status.HTTP_400_BAD_REQUEST)

        is_primary = request.data.get('is_primary', 'false').lower() == 'true'

        # Si es primaria, desmarcar las anteriores
        if is_primary:
            asset.photos.update(is_primary=False)

        photo = AssetPhoto.objects.create(
            asset=asset,
            image=image,
            is_primary=is_primary,
        )
        return Response(AssetPhotoSerializer(photo).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='ocr-extract')
    def ocr_extract(self, request):
        """Extraer datos de una imagen usando OCR."""
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Se requiere una imagen'}, status=status.HTTP_400_BAD_REQUEST)

        from .services.ocr_service import OCRService
        result = OCRService.extract_from_image(image)
        return Response(result)

    @action(detail=True, methods=['post'])
    def depreciate(self, request, pk=None):
        """Calcular depreciación para un activo individual."""
        asset = self.get_object()
        from .services.depreciation_service import DepreciationService
        period_date = request.data.get('period_date')
        if period_date:
            from datetime import date as date_cls
            period_date = date_cls.fromisoformat(period_date)
        record = DepreciationService.calculate(asset, period_date=period_date, user=request.user)
        if record:
            return Response(AssetDepreciationSerializer(record).data, status=status.HTTP_201_CREATED)
        return Response({'message': 'No aplica depreciación para este activo/período'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Proyección del cronograma de depreciación."""
        asset = self.get_object()
        from .services.depreciation_service import DepreciationService
        schedule = DepreciationService.get_schedule(asset)
        return Response(schedule)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Resumen general de activos."""
        qs = self.get_queryset()
        total = qs.count()
        by_status = dict(qs.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))
        agg = qs.aggregate(
            total_acquisition=Sum('acquisition_cost'),
            total_book_value=Sum('current_book_value'),
        )
        return Response({
            'total': total,
            'active': by_status.get('ACTIVE', 0),
            'maintenance': by_status.get('MAINTENANCE', 0),
            'disposed': by_status.get('DISPOSED', 0),
            'transferred': by_status.get('TRANSFERRED', 0),
            'total_acquisition_cost': float(agg['total_acquisition'] or 0),
            'total_book_value': float(agg['total_book_value'] or 0),
        })


# ─── Movimientos ──────────────────────────
class AssetMovementViewSet(viewsets.ModelViewSet):
    """
    CRUD para movimientos/guías de remisión.
    Incluye acciones de dispatch y receive.
    """
    queryset = AssetMovement.objects.select_related(
        'origin_warehouse', 'origin_warehouse__branch',
        'destination_warehouse', 'destination_warehouse__branch',
        'dispatched_by', 'received_by',
    ).prefetch_related('assets').all()
    serializer_class = AssetMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'origin_warehouse', 'destination_warehouse']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'], url_path='dispatch')
    def dispatch_movement(self, request, pk=None):
        """Despachar un movimiento (DRAFT → IN_TRANSIT)."""
        movement = self.get_object()
        if movement.status != 'DRAFT':
            return Response(
                {'error': 'Solo se pueden despachar movimientos en estado Borrador'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if movement.assets.count() == 0:
            return Response(
                {'error': 'El movimiento no tiene activos asignados'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Marcar activos como en tránsito
        movement.assets.update(status='TRANSFERRED')

        movement.status = 'IN_TRANSIT'
        movement.dispatched_at = timezone.now()
        movement.dispatched_by = request.user
        movement.save()

        return Response(AssetMovementSerializer(movement).data)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """Confirmar recepción (IN_TRANSIT → RECEIVED)."""
        movement = self.get_object()
        if movement.status != 'IN_TRANSIT':
            return Response(
                {'error': 'Solo se pueden recibir movimientos en tránsito'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mover activos al almacén destino
        for asset in movement.assets.all():
            asset.warehouse = movement.destination_warehouse
            asset.status = 'ACTIVE'
            asset.save(update_fields=['warehouse', 'status', 'updated_at'])

        movement.status = 'RECEIVED'
        movement.received_at = timezone.now()
        movement.received_by = request.user
        movement.save()

        return Response(AssetMovementSerializer(movement).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancelar un movimiento."""
        movement = self.get_object()
        if movement.status == 'RECEIVED':
            return Response(
                {'error': 'No se puede cancelar un movimiento ya recibido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si estaba en tránsito, restaurar activos
        if movement.status == 'IN_TRANSIT':
            for asset in movement.assets.all():
                asset.status = 'ACTIVE'
                asset.save(update_fields=['status', 'updated_at'])

        movement.status = 'CANCELLED'
        movement.save()

        return Response(AssetMovementSerializer(movement).data)


# ─── Depreciación ──────────────────────────
class AssetDepreciationViewSet(viewsets.ModelViewSet):
    """Registros de depreciación por activo."""
    queryset = AssetDepreciation.objects.select_related('asset').all()
    serializer_class = AssetDepreciationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['asset']

    @action(detail=False, methods=['post'], url_path='batch')
    def batch(self, request):
        """Calcular depreciación masiva para todos los activos activos."""
        from .services.depreciation_service import DepreciationService
        period_date = request.data.get('period_date')
        if period_date:
            from datetime import date as date_cls
            period_date = date_cls.fromisoformat(period_date)
        result = DepreciationService.calculate_batch(period_date=period_date, user=request.user)
        return Response(result)


# ─── Auditoría ──────────────────────────
class AssetAuditViewSet(viewsets.ModelViewSet):
    """Sesiones de auditoría de inventario."""
    queryset = AssetAudit.objects.select_related(
        'warehouse', 'warehouse__branch', 'conducted_by'
    ).prefetch_related('items').all()
    serializer_class = AssetAuditSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['warehouse', 'status']

    @action(detail=True, methods=['post'], url_path='add-item')
    def add_item(self, request, pk=None):
        """Agregar un ítem encontrado en la auditoría."""
        audit = self.get_object()
        if audit.status != 'IN_PROGRESS':
            return Response(
                {'error': 'La auditoría no está en progreso'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AssetAuditItemSerializer(data={
            'audit': audit.id,
            **request.data,
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Actualizar conteos
        items = audit.items.all()
        audit.total_found = items.filter(result='FOUND').count()
        audit.total_missing = items.filter(result='MISSING').count()
        audit.total_surplus = items.filter(result='SURPLUS').count()
        audit.save(update_fields=['total_found', 'total_missing', 'total_surplus'])

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Cerrar una auditoría."""
        audit = self.get_object()
        audit.status = 'COMPLETED'
        audit.completed_at = timezone.now()
        audit.save()
        return Response(AssetAuditSerializer(audit).data)

    def perform_create(self, serializer):
        warehouse = serializer.validated_data['warehouse']
        total_expected = Asset.objects.filter(
            warehouse=warehouse, status='ACTIVE'
        ).count()
        serializer.save(
            conducted_by=self.request.user,
            total_expected=total_expected,
        )


# ─── Avalúo por Sede ──────────────────────────
class ValuationViewSet(viewsets.ViewSet):
    """
    Reporte de avalúo agrupado por sede y almacén.
    GET /api/assets/valuation/
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        from payroll_core.models import Branch

        branches = Branch.objects.filter(is_active=True)
        result = []

        for branch in branches:
            warehouses_data = []
            branch_total_assets = 0
            branch_total_acq = 0
            branch_total_book = 0

            for wh in branch.warehouses.filter(is_active=True):
                assets = Asset.objects.filter(warehouse=wh, status='ACTIVE')
                agg = assets.aggregate(
                    total_acq=Sum('acquisition_cost'),
                    total_book=Sum('current_book_value'),
                    count=Count('id'),
                )
                count = agg['count'] or 0
                total_acq = float(agg['total_acq'] or 0)
                total_book = float(agg['total_book'] or 0)

                warehouses_data.append({
                    'warehouse_id': wh.id,
                    'warehouse_name': wh.name,
                    'asset_count': count,
                    'total_acquisition_cost': total_acq,
                    'total_book_value': total_book,
                    'total_depreciation': round(total_acq - total_book, 2),
                })

                branch_total_assets += count
                branch_total_acq += total_acq
                branch_total_book += total_book

            result.append({
                'branch_id': branch.id,
                'branch_name': branch.name,
                'warehouses': warehouses_data,
                'total_assets': branch_total_assets,
                'total_acquisition_cost': branch_total_acq,
                'total_book_value': branch_total_book,
                'total_depreciation': round(branch_total_acq - branch_total_book, 2),
            })

        return Response(result)
