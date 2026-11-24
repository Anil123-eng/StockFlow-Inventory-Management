from django.db import models
from accounts.models import Organization


class Product(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='products'
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=0)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    low_stock_threshold = models.PositiveIntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'sku'],
                name='unique_sku_per_organization'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"