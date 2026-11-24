from django.db import models
from django.contrib.auth.models import User


class Organization(models.Model):
    name = models.CharField(max_length=255)
    owner = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='organization'
    )
    default_low_stock_threshold = models.PositiveIntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name