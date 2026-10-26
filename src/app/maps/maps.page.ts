
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { DataService } from '../data.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-maps',
  templateUrl: './maps.page.html',
  styleUrls: ['./maps.page.scss'],
  standalone: false,
})
export class MapsPage implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  map!: L.Map;

  constructor() {}

  ngOnInit(): void {
    if (!this.map) {
      setTimeout(() => {
        const mapElement = document.getElementById('map');

        if (!mapElement || this.map) {
          return;
        }

        // Inisialisasi peta
        this.map = L.map(mapElement).setView(
          [-7.7956, 110.3695],
          13
        );

        const osm = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '&copy; OpenStreetMap contributors',
          }
        );

        osm.addTo(this.map);

        // Ambil data marker dari Firebase
        this.loadPoints();
      }, 100);
    }
  }

  async loadPoints(): Promise<void> {
    try {
      const data: any = await this.dataService.getPoints();

      console.log('Data Firebase:', data);

      if (!data) {
        console.log('Belum ada data marker.');
        return;
      }

      Object.keys(data).forEach((key: string) => {
        const point = data[key];

        if (!point || !point.coordinates) {
          console.warn('Koordinat tidak tersedia:', key);
          return;
        }

        // Format koordinat: latitude,longitude
        const coordinates = String(point.coordinates)
          .split(',')
          .map((coordinate: string) => Number(coordinate.trim()));

        const lat = coordinates[0];
        const lng = coordinates[1];

        console.log('Point:', point.name);
        console.log('Latitude:', lat);
        console.log('Longitude:', lng);

        if (
          coordinates.length !== 2 ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          console.warn('Koordinat tidak valid:', point.coordinates);
          return;
        }

        // Marker biru sederhana
        const marker = L.marker([lat, lng], {
          icon: this.createMarkerIcon(),
        }).addTo(this.map);

        // Popup: Nama, Description, Edit biru dan Delete merah
        const popupContent = `
          <div style="
            width:180px;
            padding:0;
            text-align:left;
            font-family:Arial,sans-serif;
          ">

            <!-- NAMA POINT -->
            <div style="
              margin:0 0 8px 0;
              padding:0;
              color:#333;
              font-size:15px;
              font-weight:500;
              line-height:1.4;
              text-align:left;
              overflow-wrap:anywhere;
            ">
              ${this.escapeHtml(String(point.name ?? 'Tanpa nama'))}
            </div>

            <!-- DESCRIPTION -->
            <div style="
              margin:0 0 10px 0;
              padding:0;
              color:#666;
              font-size:13px;
              font-weight:400;
              line-height:1.5;
              text-align:left;
              overflow-wrap:anywhere;
              white-space:pre-wrap;
            ">${this.escapeHtml(
              String(point.description ?? 'Tidak ada deskripsi')
            )}</div>

            <!-- TOMBOL EDIT DAN DELETE -->
            <div style="
              display:flex;
              align-items:center;
              justify-content:flex-start;
              gap:12px;
              margin:0;
              padding:0;
            ">

              <!-- EDIT BIRU -->
              <a
                href="/editpoint/${encodeURIComponent(key)}"
                title="Edit"
                aria-label="Edit"
                style="
                  display:inline-flex;
                  align-items:center;
                  justify-content:center;
                  width:32px;
                  height:32px;
                  color:#1688d4;
                  text-decoration:none;
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1688d4"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
                </svg>
              </a>

              <!-- DELETE MERAH -->
              <button
                type="button"
                class="delete-link"
                data-key="${this.escapeHtml(key)}"
                title="Delete"
                aria-label="Delete"
                style="
                  display:inline-flex;
                  align-items:center;
                  justify-content:center;
                  width:32px;
                  height:32px;
                  padding:0;
                  border:none;
                  background:transparent;
                  color:#e53935;
                  cursor:pointer;
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e53935"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14H6L5 6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                  <path d="M9 6V4h6v2"></path>
                </svg>
              </button>

            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        // Event klik Delete
        marker.on('popupopen', (event: L.PopupEvent) => {
          const popupElement = event.popup.getElement();

          const deleteButton =
            popupElement?.querySelector<HTMLButtonElement>(
              '.delete-link'
            );

          if (!deleteButton) {
            return;
          }

          deleteButton.onclick = async (clickEvent: MouseEvent) => {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();

            const confirmed = window.confirm(
              `Yakin ingin menghapus titik "${point.name ?? 'Tanpa nama'}"?`
            );

            if (!confirmed) {
              return;
            }

            deleteButton.disabled = true;

            try {
              // Hapus data dari Firebase
              await this.dataService.deletePoint(key);

              // Hapus marker yang dipilih dari peta
              this.map.removeLayer(marker);

              console.log('Titik berhasil dihapus:', key);
            } catch (error) {
              console.error('Gagal menghapus titik:', error);

              window.alert(
                'Gagal menghapus titik. Periksa koneksi dan Firebase.'
              );

              deleteButton.disabled = false;
            }
          };
        });
      });

      // Perbaiki ukuran peta
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 200);

    } catch (error) {
      console.error('Gagal mengambil data Firebase:', error);
    }
  }

  // Ikon marker pin biru tanpa file gambar tambahan
  private createMarkerIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="25"
          height="34"
          viewBox="0 0 25 34"
        >
          <path
            d="M12.5 33 C10 27 1 17 1 12.5 A11.5 11.5 0 1 1 24 12.5 C24 17 15 27 12.5 33Z"
            fill="#3288cf"
          />
          <circle
            cx="12.5"
            cy="12"
            r="4"
            fill="#ffffff"
          />
        </svg>
      `,
      iconSize: [25, 34],
      iconAnchor: [12, 33],
      popupAnchor: [0, -30],
    });
  }

  // Mengamankan teks HTML
  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[character];
    });
  }

  // Fungsi deletePoint tetap tersedia
  async deletePoint(
    key: string,
    latLng: L.LatLng | undefined
  ): Promise<void> {
    await this.dataService.deletePoint(key);

    if (latLng) {
      this.map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          if (layer.getLatLng().equals(latLng)) {
            this.map.removeLayer(layer);
          }
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
