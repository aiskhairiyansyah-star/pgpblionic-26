
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController } from '@ionic/angular';
import { DataService } from '../data.service';
import * as L from 'leaflet';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';

const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-editpoint',
  templateUrl: './editpoint.page.html',
  styleUrls: ['./editpoint.page.scss'],
  standalone: false,
})
export class EditpointPage implements OnInit {

  map!: L.Map;
  key = '';
  name = '';
  coordinates = '';
  description = '';

  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private dataService = inject(DataService);

  constructor() { }

  async ngOnInit() {
    try {
      this.key = this.route.snapshot.paramMap.get('key') || '';

      if (!this.key) {
        throw new Error('ID point tidak ditemukan.');
      }

      const point: any = await this.dataService.getPoint(this.key);

      if (!point) {
        throw new Error('Data point tidak ditemukan.');
      }

      this.name = point.name || '';
      this.coordinates = point.coordinates || '';
      this.description = point.description || '';

      // Load map
      const coords = this.coordinates.split(',').map(Number) as [number, number];

      if (
        coords.length !== 2 ||
        !Number.isFinite(coords[0]) ||
        !Number.isFinite(coords[1])
      ) {
        throw new Error('Koordinat point tidak valid.');
      }

      this.map = L.map('mapedit').setView(coords, 13);

      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '© OpenStreetMap contributors'
        }
      );

      const esri = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'ESRI'
        }
      );

      osm.addTo(this.map);

      const baseMaps = {
        'OpenStreetMap': osm,
        'Esri World Imagery': esri
      };

      L.control.layers(baseMaps).addTo(this.map);

      const tooltip =
        'Drag the marker to change the coordinates of the location';

      const marker = L.marker(coords, { draggable: true });

      marker.addTo(this.map);
      marker.bindPopup(tooltip);
      marker.openPopup();

      // Update coordinates when marker is moved
      marker.on('dragend', (e) => {
        const latlng = e.target.getLatLng();
        const lat = latlng.lat.toFixed(9);
        const lng = latlng.lng.toFixed(9);

        this.coordinates = lat + ',' + lng;
      });

      // Allow Leaflet to calculate the correct map size
      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);

    } catch (error: any) {
      console.error('Gagal memuat point:', error);

      const alert = await this.alertCtrl.create({
        header: 'Load Failed',
        message: error.message || 'Gagal memuat data point.',
        buttons: ['OK']
      });

      await alert.present();
    }
  }

  async save() {
    if (!this.name.trim() || !this.coordinates.trim()) {
      const alert = await this.alertCtrl.create({
        header: 'Data Belum Lengkap',
        message: 'Name dan Coordinates wajib diisi.',
        buttons: ['OK']
      });

      await alert.present();
      return;
    }

    const coords = this.coordinates.split(',').map(Number);

    if (
      coords.length !== 2 ||
      !Number.isFinite(coords[0]) ||
      !Number.isFinite(coords[1]) ||
      coords[0] < -90 || coords[0] > 90 ||
      coords[1] < -180 || coords[1] > 180
    ) {
      const alert = await this.alertCtrl.create({
        header: 'Koordinat Tidak Valid',
        message: 'Gunakan format latitude,longitude. Contoh: -7.7956,110.3695',
        buttons: ['OK']
      });

      await alert.present();
      return;
    }

    try {
      await this.dataService.updatePoint(this.key, {
        name: this.name.trim(),
        coordinates: `${coords[0]},${coords[1]}`,
        description: this.description.trim()
      });

      this.navCtrl.back();

    } catch (error: any) {
      const alert = await this.alertCtrl.create({
        header: 'Save Failed',
        message: error.message || 'Gagal menyimpan perubahan.',
        buttons: ['OK']
      });

      await alert.present();
    }
  }
}
