from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Employee

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # El username que envía el usuario es la cédula
        data = super().validate(attrs)
        
        # Añadir información extra del empleado al token si se desea
        employee = getattr(self.user, 'employee', None)
        if employee:
            data['employee_id'] = employee.id
            data['full_name'] = employee.full_name
            data['role'] = 'manager' # Opcional: podrías sacarlo del cargo
            
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class AccountSetupView(APIView):
    """
    Endpoint para crear o actualizar el usuario de un empleado.
    Valida que la cédula exista y toma los datos automáticamente.
    """
    permission_classes = [permissions.AllowAny] # Opcional: restringir según convenniencia

    def post(self, request):
        print(f"DEBUG: AccountSetupView recibiendo datos: {request.data}")
        national_id = request.data.get('national_id')
        password = request.data.get('password')

        if not national_id or not password:
            return Response(
                {"error": "Debe proporcionar cédula y contraseña."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Validar que la cédula existe en los empleados
        try:
            employee = Employee.objects.get(national_id=national_id)
        except Employee.DoesNotExist:
            return Response(
                {"error": f"No se encontró un empleado con la cédula {national_id}."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Verificar si ya tiene usuario
        from django.contrib.auth.models import User
        user = employee.user
        
        if not user:
            # 3. Crear usuario automáticamente con datos del empleado
            user, created = User.objects.get_or_create(username=national_id)
            user.email = employee.email or ""
            user.first_name = employee.first_name
            user.last_name = employee.last_name
            employee.user = user
            employee.save()
        
        # 4. Establecer contraseña
        user.set_password(password)
        user.save()

        return Response({
            "status": "success",
            "message": f"Cuenta configurada correctamente para {employee.full_name}.",
            "username": national_id
        })
