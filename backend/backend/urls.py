from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path

def health(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [path('api/health/', health), path('api/', include('LMS.urls'))]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
