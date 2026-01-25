'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGPSTracking } from '@/lib/hooks/use-gps-tracking'
import { MapPin, Navigation, AlertCircle } from 'lucide-react'

export function GPSTrackingWidget() {
  const {
    isTracking,
    currentLocation,
    error,
    permissionStatus,
    isOnline,
    startTracking,
    stopTracking
  } = useGPSTracking()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-500" />
              GPS Takip
            </CardTitle>
            <CardDescription>
              Konumunuz yöneticiniz tarafından izlenecek
            </CardDescription>
          </div>
          <Badge variant={isTracking ? 'success' : 'default'}>
            {isTracking ? 'Aktif' : 'Pasif'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOnline && (
          <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <p className="text-sm text-orange-500">
              İnternet bağlantısı yok. Uçak modunu kapatın.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {currentLocation && (
          <div className="rounded-lg bg-slate-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-slate-400">Son Konum:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Enlem:</span>
                <p className="text-white font-mono">{currentLocation.latitude.toFixed(6)}</p>
              </div>
              <div>
                <span className="text-slate-400">Boylam:</span>
                <p className="text-white font-mono">{currentLocation.longitude.toFixed(6)}</p>
              </div>
              <div>
                <span className="text-slate-400">Hassasiyet:</span>
                <p className="text-white">{Math.round(currentLocation.accuracy)}m</p>
              </div>
              <div>
                <span className="text-slate-400">Güncelleme:</span>
                <p className="text-white">
                  {new Date(currentLocation.timestamp).toLocaleTimeString('tr-TR')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isTracking ? (
            <Button 
              onClick={startTracking} 
              className="flex-1"
              disabled={permissionStatus === 'denied' || !isOnline}
            >
              <Navigation className="mr-2 h-4 w-4" />
              Takibi Başlat
            </Button>
          ) : (
            <Button 
              onClick={stopTracking} 
              variant="outline"
              className="flex-1"
            >
              Takibi Durdur
            </Button>
          )}
        </div>

        {permissionStatus === 'denied' && (
          <p className="text-xs text-slate-400 text-center">
            Konum izni reddedildi. Tarayıcı ayarlarından izin verin.
          </p>
        )}

        {!isOnline && (
          <p className="text-xs text-orange-400 text-center">
            GPS takibi için internet bağlantısı gerekli.
          </p>
        )}

        {isTracking && (
          <p className="text-xs text-slate-400 text-center">
            GPS takibi aktif. Konumunuz her 10 metreden bir güncelleniyor.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
