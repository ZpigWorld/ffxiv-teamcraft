import { Component } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { stats } from '../../../core/data/sources/stats';
import { TeamcraftComponent } from '../../../core/component/teamcraft-component';
import { SearchIndex, XivapiSearchFilter, XivapiService } from '@xivapi/angular-client';
import { LazyDataService } from '../../../core/data/lazy-data.service';

@Component({
  selector: 'app-food-picker',
  templateUrl: './food-picker.component.html',
  styleUrls: ['./food-picker.component.less']
})
export class FoodPickerComponent extends TeamcraftComponent {

  public availableStats = stats;

  public stats$ = new BehaviorSubject<any[]>([null]);

  public results$: Observable<any[]>;

  public loading = false;

  constructor(private xivapi: XivapiService, private lazyData: LazyDataService) {
    super();

    this.results$ = this.stats$.pipe(
      filter(pickedStats => {
        return pickedStats.length > 0 && pickedStats.every(s => s !== null);
      }),
      debounceTime(500),
      switchMap((pickedStats) => {
        this.loading = true;

        const filters = pickedStats.map(stat => {
          return {
            column: 'Bonuses.' + stat.filterName + '.ID',
            operator: '=' as XivapiSearchFilter['operator'],
            value: stat.id
          };
        });

        return this.xivapi.search({
          indexes: [SearchIndex.ITEM],
          filters: filters
        });
      }),
      map((searchResult) => {
        return searchResult.Results
          .map(item => {
            const itemDetails = [...this.lazyData.data.foods, ...this.lazyData.data.medicines].find(f => f.ID === item.ID);
            return {
              id: item.ID,
              bonuses: Object.values(itemDetails.Bonuses) //TODO: Sort Bonuses so first attribute researched comes first
            };
          }).sort((a, b) => {
            return a.id === b.id ? a.id - b.id : b.id - a.id;
          });
      }),
      tap(() => this.loading = false)
    );
  }

  trackByIndex(index: number): number {
    return index;
  }

  changeStat(index: number, value: any): void {
    const newArray = [...this.stats$.value];
    newArray[index] = value;
    this.stats$.next(newArray);
  }

  addStat(): void {
    this.stats$.next([
      ...this.stats$.value,
      null
    ]);
  }

}
