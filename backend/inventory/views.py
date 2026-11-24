from django.shortcuts import get_object_or_404
from django.db.models import Q, F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
 

from .models import Product


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def product_list_create(request):
    organization = request.user.organization

    if request.method == 'GET':
        products = Product.objects.filter(organization=organization)

        search = request.query_params.get('search')
        if search:
            products = products.filter(
                Q(name__icontains=search) | Q(sku__icontains=search)
            )

        low_stock = request.query_params.get('low_stock')
        if low_stock == 'true':
            products = products.filter(
                quantity__lte=F('low_stock_threshold')
            )

        data = [
            {
                'id': product.id,
                'name': product.name,
                'sku': product.sku,
                'description': product.description,
                'quantity': product.quantity,
                'cost_price': str(product.cost_price),
                'selling_price': str(product.selling_price),
                'low_stock_threshold': product.low_stock_threshold,
                'created_at': product.created_at,
                'updated_at': product.updated_at,
            }
            for product in products
        ]

        return Response(data)

    data = request.data

    required_fields = ['name', 'sku', 'cost_price', 'selling_price']
    for field in required_fields:
        if field not in data or data[field] in ['', None]:
            return Response(
                {'error': f'{field} is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    if Product.objects.filter(
        organization=organization,
        sku=data['sku']
    ).exists():
        return Response(
            {'error': 'This SKU already exists in your organization.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    product = Product.objects.create(
        organization=organization,
        name=data['name'],
        sku=data['sku'],
        description=data.get('description', ''),
        quantity=data.get('quantity', 0),
        cost_price=data['cost_price'],
        selling_price=data['selling_price'],
        low_stock_threshold=data.get(
            'low_stock_threshold',
            organization.default_low_stock_threshold
        )
    )

    return Response(
        {
            'message': 'Product created successfully.',
            'product_id': product.id
        },
        status=status.HTTP_201_CREATED
    )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def product_detail(request, product_id):
    organization = request.user.organization

    product = get_object_or_404(
        Product,
        id=product_id,
        organization=organization
    )

    if request.method == 'GET':
        return Response({
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'description': product.description,
            'quantity': product.quantity,
            'cost_price': str(product.cost_price),
            'selling_price': str(product.selling_price),
            'low_stock_threshold': product.low_stock_threshold,
        })

    if request.method == 'PUT':
        data = request.data

        required_fields = ['name', 'sku', 'cost_price', 'selling_price']
        for field in required_fields:
            if field not in data or data[field] in ['', None]:
                return Response(
                    {'error': f'{field} is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if Product.objects.filter(
            organization=organization,
            sku=data['sku']
        ).exclude(id=product.id).exists():
            return Response(
                {'error': 'This SKU already exists in your organization.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        product.name = data['name']
        product.sku = data['sku']
        product.description = data.get('description', '')
        product.quantity = data.get('quantity', 0)
        product.cost_price = data['cost_price']
        product.selling_price = data['selling_price']
        product.low_stock_threshold = data.get(
            'low_stock_threshold',
            organization.default_low_stock_threshold
        )
        product.save()

        return Response({'message': 'Product updated successfully.'})

    product.delete()
    return Response(
        {'message': 'Product deleted successfully.'},
        status=status.HTTP_200_OK
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    organization = request.user.organization

    products = Product.objects.filter(organization=organization)

    total_products = products.count()

    total_stock = sum(
        product.quantity for product in products
    )

    low_stock_products = products.filter(
        quantity__lte=F('low_stock_threshold')
    )

    low_stock_data = [
        {
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'quantity': product.quantity,
            'low_stock_threshold': product.low_stock_threshold,
        }
        for product in low_stock_products
    ]

    return Response({
        'total_products': total_products,
        'total_stock': total_stock,
        'low_stock_products': low_stock_data,
    })