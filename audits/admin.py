from django.contrib import admin
from .models import TaskCategory, Task, TaskEvidence

@admin.register(TaskCategory)
class TaskCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    search_fields = ('name',)

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'sede', 'assignee', 'status', 'priority', 'due_date', 'created_at')
    list_filter = ('status', 'priority', 'category')
    search_fields = ('title', 'description', 'sede__name')

@admin.register(TaskEvidence)
class TaskEvidenceAdmin(admin.ModelAdmin):
    list_display = ('task', 'uploaded_by', 'uploaded_at')
