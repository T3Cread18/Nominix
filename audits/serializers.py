from rest_framework import serializers
from .models import (
    ChecklistTemplate, ChecklistCategory, ChecklistItem, 
    TaskCategory, Task, TaskEvidence, ChecklistAnswer
)

class ChecklistCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistCategory
        fields = ['id', 'name', 'order']

class ChecklistTemplateSerializer(serializers.ModelSerializer):
    categories = ChecklistCategorySerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTemplate
        fields = [
            'id', 'name', 'description', 'categories', 'items_count', 
            'is_active', 'frequency', 'preferred_time', 'preferred_day'
        ]
    
    def get_items_count(self, obj):
        return ChecklistItem.objects.filter(category__template=obj).count()

class ChecklistItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = ChecklistItem
        fields = ['id', 'category', 'category_name', 'indicator', 'text', 'requires_image', 'order']

class ChecklistAnswerSerializer(serializers.ModelSerializer):
    item_details = ChecklistItemSerializer(source='item', read_only=True)
    
    class Meta:
        model = ChecklistAnswer
        fields = ['id', 'item', 'item_details', 'status', 'comments', 'image']

class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TaskCategory if 'models' in globals() else TaskCategory
        fields = ['id', 'name', 'description', 'is_active']

class TaskEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = TaskEvidence
        fields = ['id', 'task', 'image', 'notes', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']
        read_only_fields = ['uploaded_by']

class TaskListSerializer(serializers.ModelSerializer):
    sede_name = serializers.CharField(source='sede.name', read_only=True)
    assignee_name = serializers.CharField(source='assignee.full_name', read_only=True, default="Sin asignar")
    creator_name = serializers.CharField(source='creator.get_full_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default="Sin categoría")
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    has_checklist = serializers.SerializerMethodField()
    checklist_progress = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'category_name', 'sede', 'sede_name', 'assignee', 'assignee_name', 
            'creator_name', 'status', 'status_display', 'priority', 'priority_display', 
            'due_date', 'created_at', 'completed_at', 'has_checklist', 'checklist_progress'
        ]
    
    def get_has_checklist(self, obj):
        return obj.checklist_template_id is not None

    def get_checklist_progress(self, obj):
        answers = obj.checklist_answers.all()
        total = answers.count()
        answered = answers.exclude(status__isnull=True).exclude(status='').count()
        return {'answered': answered, 'total': total}

class TaskDetailSerializer(TaskListSerializer):
    evidences = TaskEvidenceSerializer(many=True, read_only=True)
    checklist_answers = ChecklistAnswerSerializer(many=True, read_only=True)
    checklist_template_name = serializers.CharField(source='checklist_template.name', read_only=True)
    
    class Meta(TaskListSerializer.Meta):
        fields = TaskListSerializer.Meta.fields + ['description', 'evidences', 'checklist_answers', 'checklist_template_name']

class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['title', 'description', 'category', 'sede', 'assignee', 'priority', 'due_date', 'checklist_template']
        
class TaskStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['status']
