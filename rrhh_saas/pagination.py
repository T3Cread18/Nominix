
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    """
    Paginación estándar que permite al cliente solicitar un tamaño de página específico
    usando el parámetro 'page_size'.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000
