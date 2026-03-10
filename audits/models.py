from django.db import models
from django.conf import settings

class ChecklistTemplate(models.Model):
    class Recurrence(models.TextChoices):
        DAILY = 'DAILY', 'Diario'
        WEEKLY = 'WEEKLY', 'Semanal'
        BIWEEKLY = 'BIWEEKLY', 'Quincenal'
        MONTHLY = 'MONTHLY', 'Mensual'
        MANUAL = 'MANUAL', 'Manual'

    name = models.CharField(max_length=255, help_text="Ej: Apertura Diaria, Operativo Quincenal, Legal Mensual")
    description = models.TextField(blank=True)
    frequency = models.CharField(max_length=20, choices=Recurrence.choices, default=Recurrence.MANUAL)
    preferred_time = models.TimeField(null=True, blank=True, help_text="Hora sugerida para la ejecución")
    preferred_day = models.IntegerField(null=True, blank=True, help_text="Día de la semana (1-7) o día del mes (1-31)")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class ChecklistCategory(models.Model):
    template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=255, help_text="Ej: Áreas Externas, Farmacia, Depósito")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        verbose_name_plural = "Checklist Categories"

    def __str__(self):
        return f"{self.template.name} - {self.name}"

class ChecklistItem(models.Model):
    category = models.ForeignKey(ChecklistCategory, on_delete=models.CASCADE, related_name='items')
    indicator = models.CharField(max_length=255, blank=True, help_text="Ej: Ventanales, Limpieza Fachada")
    text = models.TextField(help_text="El punto específico a evaluar")
    requires_image = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.indicator}: {self.text[:50]}..."

class TaskCategory(models.Model):
    name = models.CharField(max_length=150, unique=True, help_text="Ej: Mantenimiento, Operaciones, Legal, Inventario")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Task Categories"

    def __str__(self):
        return self.name

class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        IN_PROGRESS = 'IN_PROGRESS', 'En Progreso'
        COMPLETED = 'COMPLETED', 'Completado'
        VERIFIED = 'VERIFIED', 'Verificado/Aprobado'
        CANCELLED = 'CANCELLED', 'Cancelado'
        
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Baja'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'Alta'
        URGENT = 'URGENT', 'Urgente'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.ForeignKey(TaskCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    
    # Soporte para Checklist
    checklist_template = models.ForeignKey(ChecklistTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    
    # Asignaciones
    sede = models.ForeignKey('payroll_core.Branch', on_delete=models.CASCADE, related_name='tasks', help_text="Sede en la que se debe ejecutar la tarea")
    assignee = models.ForeignKey('payroll_core.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks', help_text="Empleado responsable (opcional)")
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tasks')
    
    # Metadatos del flujo
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    
    # Tiempos
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title} - {self.sede.name}"

class TaskEvidence(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='evidences')
    image = models.ImageField(upload_to='tasks/evidence/%Y/%m/', null=True, blank=True)
    notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class ChecklistAnswer(models.Model):
    class Response(models.TextChoices):
        OK = 'OK', 'Cumple'
        NOK = 'NOK', 'No Cumple'
        NA = 'NA', 'No Aplica'
        NE = 'NE', 'No Evaluado'

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='checklist_answers')
    item = models.ForeignKey(ChecklistItem, on_delete=models.PROTECT)
    status = models.CharField(max_length=5, choices=Response.choices, default=Response.NE)
    comments = models.TextField(blank=True)
    image = models.ImageField(upload_to='tasks/checklist/%Y/%m/', null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('task', 'item')

    def __str__(self):
        return f"Answer for {self.item.indicator} in Task {self.task_id}"
