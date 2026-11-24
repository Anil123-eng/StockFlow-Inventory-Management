from django.urls import path
from .views import product_list_create, product_detail, dashboard

urlpatterns = [
    path('products/', product_list_create, name='product-list-create'),
    path('products/<int:product_id>/', product_detail, name='product-detail'),
    path('dashboard/', dashboard, name='dashboard'),
]