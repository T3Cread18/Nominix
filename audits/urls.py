from django.urls import path
from .views import (
    TaskListCreateAPIView, TaskDetailAPIView, 
    TaskStatusUpdateAPIView, TaskEvidenceCreateAPIView,
    ChecklistTemplateListAPIView, TaskChecklistAnswerUpdateAPIView,
    ChecklistTemplateViewSet, ChecklistTemplateDetailAPIView,
    ChecklistCategoryViewSet, ChecklistItemViewSet
)

app_name = 'audits'

urlpatterns = [
    # Gestión de Tareas
    path('', TaskListCreateAPIView.as_view(), name='task-list-create'),
    path('<int:pk>/', TaskDetailAPIView.as_view(), name='task-detail'),
    path('<int:pk>/status/', TaskStatusUpdateAPIView.as_view(), name='task-status-update'),
    path('<int:task_id>/evidence/', TaskEvidenceCreateAPIView.as_view(), name='task-evidence-create'),
    
    # Gestión de Checklists (Uso en creación de Tareas)
    path('templates/', ChecklistTemplateViewSet.as_view(), name='checklist-template-list'),
    path('templates/<int:pk>/', ChecklistTemplateDetailAPIView.as_view(), name='checklist-template-detail'),
    path('templates/<int:template_id>/categories/', ChecklistCategoryViewSet.as_view(), name='checklist-category-list'),
    path('categories/<int:category_id>/items/', ChecklistItemViewSet.as_view(), name='checklist-item-list'),
    
    # Respuestas de Checklist
    path('<int:task_id>/checklist/<int:item_id>/', TaskChecklistAnswerUpdateAPIView.as_view(), name='checklist-answer-update'),
]
