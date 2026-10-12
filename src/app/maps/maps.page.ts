import { Component, OnInit, inject } from '@angular/core';
import { DataService } from '../data.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-maps',
  templateUrl: './maps.page.html',
  styleUrls: ['./maps.page.scss'],
  standalone: false,

})

export class MapsPage implements OnInit {
  private dataService = inject(DataService);
  map!: L.Map;

  constructor() { }

  ngOnInit() {
    if (!this.map) {
      setTimeout(() => {
        this.map = L.map('map').setView([-7.7956, 110.3695],
          13);

        var osm =
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'

          });

        osm.addTo(this.map);

        // marker
        L.marker([-7.7956, 110.3695]).addTo(this.map)
          .bindPopup('yogyakarta')
          .openPopup();

        // Get marker from Firebase
        this.dataService.getPoints().then((data: any) => {

          console.log('Data Firebase:', data);

          if (data) {

            Object.keys(data).forEach((key) => {

              const point = data[key];

              // coordinates format:
              // "-7.795600000,110.369500000"
              const coordinates = point.coordinates.split(',');

              const lat = Number(coordinates[0]);
              const lng = Number(coordinates[1]);

              console.log('Point:', point.name);
              console.log('Latitude:', lat);
              console.log('Longitude:', lng);

              if (!isNaN(lat) && !isNaN(lng)) {

                L.marker([lat, lng])
                  .addTo(this.map)
                  .bindPopup(`
                    <b>${point.name}</b><br>
                    ${point.description || ''}
                  `);

              }

            });

          }

        }).catch((error) => {

          console.error('Gagal mengambil data Firebase:', error);

        });

      });

    }

  }

}

// icon
const iconUrl = 'assets/icon/marker.svg';

const iconDefault = L.icon({
  iconUrl: iconUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = iconDefault;