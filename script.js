const form=document.querySelector('.form')
const containerWorkouts=document.querySelector('.workouts')
const inputType=document.querySelector('.form__input--type')
const inputDistance=document.querySelector('.form__input--distance')
const inputDuration=document.querySelector('.form__input--duration')
const inputCadence=document.querySelector('.form__input--cadence')
const inputElevation=document.querySelector('.form__input--elevation')

class App{
    #map;
    #mapEvent;
    #mapZoomLevel=13
    #workouts=[]

    constructor(){
        //Get users positions
        this._getPosition()

        //Get local storage 
        this._getLocalStorage()

        //Attach event handlers
        form.addEventListener('submit',this._newWorkout.bind(this))
        inputType.addEventListener('change',this._toggleElevationField)
        containerWorkouts.addEventListener('click',this._moveToPopup.bind(this))
    }
    _getPosition(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this),
            function(){alert('Could not get your Location!')})
        }
        
    }
    _loadMap(position){
            const {latitude}=position.coords;
            const {longitude}=position.coords;
            const coords=[latitude,longitude]
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.fr/hot//copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);
    
            this.#map.on('click',this._showForm.bind(this))

            this.#workouts.forEach(work=>{
                this._renderWorkout(work)
                this._renderWorkoutMarker(work)
            })
            
    }
    _showForm(mapE){
        this.#mapEvent=mapE
        form.classList.remove('hidden')
        inputDistance.focus()
    }
    _hideForm(){
        //Empty Inputs
        inputDistance.value=inputDuration.value=inputCadence.value=inputElevation.value=''   
        form.style.display='none'
        form.classList.add('hidden')
        setTimeout(()=>form.style.display='grid',1000)
    }
    _toggleElevationField(){
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    }
    _newWorkout(e){
        const validInputs=(...inputs)=>
            inputs.every(inp=>Number.isFinite(inp))

        const allPositive=(...inputs)=>
            inputs.every(inp=> inp>0)
        e.preventDefault()

        //Get data from form
        const type=inputType.value
        const distance= +inputDistance.value
        const duration= +inputDuration.value
        const {lat,lng}=this.#mapEvent.latlng
        let workout
        
        //If workout running,create running object
        if(type==='running'){
            const cadance= +inputCadence.value

            //Check if the data is valid
            //if(!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadance)) return alert('Inputs have to be positive numbers!')
            if(!validInputs(duration,distance,cadance) || !allPositive(duration,distance,cadance)) return alert('Inputs must be positive numbers!')

            workout=new Running([lat,lng],distance,duration,cadance)
            
        }
        //If workout cycling,create cycling object
        if(type==='cycling'){
            const elevation= +inputElevation.value

            //Check if the data is valid
            if(!validInputs(duration,distance,elevation) || !allPositive(duration,distance)) return alert('Inputs must be positive numbers!')

            workout=new Cycling([lat,lng],distance,duration,elevation)

        }
        //Add new object to workout array
        this.#workouts.push(workout)
        console.log(workout)
        //Render workout on map as marker
        this._renderWorkoutMarker(workout)
        //Render workout on list
        this._renderWorkout(workout)
        //Hide form + clear input fileds
        this._hideForm()

        //Set Local storage to all workouts
        this._setLocalStorage()
    } 
    
    
    _renderWorkoutMarker(workout) {
            L.marker(workout.coords).addTo(this.#map)
                .bindPopup(L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    closeOnClick:false,
                    autoClose:false,
                    className:`${workout.type}-popup`
            }))
                .setPopupContent(`${workout.type==='running'?'🏃‍♂️':'🚴‍♂️'} ${workout.description}`)
                .openPopup();
    }

    _renderWorkout(workout){
        let html=`
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type==='running'?'🏃‍♂️':'🚴‍♂️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `

        if(workout.type==='running'){
            html+=`
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadance}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
            `} 

        if(workout.type==='cycling'){
                html+=`
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
           `
           
        }
        form.insertAdjacentHTML('afterend',html)
           console.log('entered block')
    }
    _moveToPopup(e){
        const workEl=e.target.closest('.workout')
        console.log(workEl)

        if(!workEl) return

        const workout=this.#workouts.find(work=>work.id===workEl.dataset.id)

        this.#map.setView(workout.coords,this.#mapZoomLevel,{
            animate:true,
            pan:{
                duration:1
            }
        })
        // workout.click()
    }
    _getLocalStorage(){
        const data=JSON.parse(localStorage.getItem('workouts'))
        
        if(!data)return

        this.#workouts=data

        this.#workouts.forEach(work=>{
            this._renderWorkout(work)
        }
            
            )

    }

    _setLocalStorage(){
        localStorage.setItem('workouts',JSON.stringify(this.#workouts))
    }
    reset(){
        localStorage.removeItem('workouts')
        location.reload()
    }
}

class Workout{
    date=new Date()
    id=(Date.now()+'').slice(-10)
    clicks=0

    constructor(coords,distance,duration){2525
        this.coords=coords
        this.distance=distance
        this.duration=duration
    }

    _setDescription(){
        const month=['January','February','March','April','May',"June",'July','August','September','October','November','December']
        this.description=`${this.type[0].toUpperCase()}${this.type.slice(1)} on ${month[this.date.getMonth()]} ${this.date.getDay()}`
    }

    click(){
        this.clicks++
    }
}
class Running extends Workout{
    type='running'
    constructor(coords,distance,duration,cadance){
        super(coords,duration,distance)
        this.cadance=cadance
        this.calcPace()
        this._setDescription()
    }
    calcPace(){
        this.pace=this.duration/this.distance
        return this.pace
    }
}
class Cycling extends Workout{
    type='cycling'
    constructor(coords,distance,duration,elevationGain){
        super(coords,duration,distance)
        this.elevationGain=elevationGain
        this.calcSpeed()
        this._setDescription()
    }
    calcSpeed(){
        this.speed=this.distance/(this.duration/60)
        return this.speed
    }
}

const app=new App()