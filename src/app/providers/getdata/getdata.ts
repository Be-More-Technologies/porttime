import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

/*
  Generated class for the GetdataProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class GetdataProvider {

  constructor(public http: HttpClient) {
  }

  getObjectData() {

    return this.http.get('../../assets/json/payperiod.json')
   
   } 
   

}
