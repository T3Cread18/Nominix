from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import (
    Task, TaskCategory, TaskEvidence, 
    ChecklistTemplate, ChecklistCategory, ChecklistItem, ChecklistAnswer
)
from .serializers import (
    TaskListSerializer, TaskDetailSerializer, 
    TaskCreateSerializer, TaskEvidenceSerializer,
    TaskStatusUpdateSerializer, ChecklistTemplateSerializer,
    ChecklistCategorySerializer, ChecklistItemSerializer,
    ChecklistAnswerSerializer
)

class ChecklistTemplateViewSet(generics.ListCreateAPIView):
    queryset = ChecklistTemplate.objects.filter(is_active=True).order_by('name')
    serializer_class = ChecklistTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

class ChecklistTemplateDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ChecklistTemplate.objects.all()
    serializer_class = ChecklistTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

class ChecklistCategoryViewSet(generics.ListCreateAPIView):
    serializer_class = ChecklistCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ChecklistCategory.objects.filter(template_id=self.kwargs['template_id']).order_by('order')
    
    def perform_create(self, serializer):
        serializer.save(template_id=self.kwargs['template_id'])

class ChecklistItemViewSet(generics.ListCreateAPIView):
    serializer_class = ChecklistItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ChecklistItem.objects.filter(category_id=self.kwargs['category_id']).order_by('order')
        
    def perform_create(self, serializer):
        serializer.save(category_id=self.kwargs['category_id'])

# Mantener las vistas originales y actualizar si es necesario
class ChecklistTemplateListAPIView(generics.ListAPIView):
    queryset = ChecklistTemplate.objects.filter(is_active=True)
    serializer_class = ChecklistTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

class TaskListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Task.objects.select_related('sede', 'assignee', 'creator', 'category', 'checklist_template').prefetch_related('checklist_answers')
        
        sede_id = self.request.query_params.get('sede_id')
        status = self.request.query_params.get('status')
        assignee_id = self.request.query_params.get('assignee_id')
        
        if sede_id:
            queryset = queryset.filter(sede_id=sede_id)
        if status:
            queryset = queryset.filter(status=status)
        if assignee_id:
            queryset = queryset.filter(assignee_id=assignee_id)
            
        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskCreateSerializer
        return TaskListSerializer
        
    def perform_create(self, serializer):
        with transaction.atomic():
            task = serializer.save(creator=self.request.user)
            
            # Si tiene un checklist template, generar las respuestas vacías
            if task.checklist_template:
                items = ChecklistItem.objects.filter(category__template=task.checklist_template)
                answers = [
                    ChecklistAnswer(task=task, item=item)
                    for item in items
                ]
                ChecklistAnswer.objects.bulk_create(answers)

class TaskDetailAPIView(generics.RetrieveAPIView):
    queryset = Task.objects.select_related('sede', 'assignee', 'creator', 'category', 'checklist_template').prefetch_related('evidences', 'checklist_answers__item__category')
    serializer_class = TaskDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

class TaskStatusUpdateAPIView(generics.UpdateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_update(self, serializer):
        new_status = serializer.validated_data.get('status')
        if new_status in [Task.Status.COMPLETED, Task.Status.VERIFIED]:
            serializer.save(completed_at=timezone.now())
        else:
            serializer.save()

class TaskChecklistAnswerUpdateAPIView(generics.UpdateAPIView):
    """
    Actualizar una respuesta específica de un checklist.
    """
    queryset = ChecklistAnswer.objects.all()
    serializer_class = ChecklistAnswerSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_object(self):
        return get_object_or_404(
            ChecklistAnswer, 
            task_id=self.kwargs['task_id'], 
            item_id=self.kwargs['item_id']
        )

class TaskEvidenceCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, task_id, format=None):
        task = get_object_or_404(Task, id=task_id)
        serializer = TaskEvidenceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(task=task, uploaded_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
