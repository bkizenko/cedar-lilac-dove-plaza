import type { Unit } from "./types";
const cache = new WeakMap<Unit, ReturnType<typeof calculate>>();
export function predisposition(u:Unit) {
  let value=cache.get(u);if(!value){value=calculate(u);cache.set(u,value);}return value;
}
/** Stable identity-based predispositions: no random rerolls on loading or changing jobs. */
function calculate(u: Unit) {
  const sample=(salt:number)=>{
    let n=Math.imul(u.id ^ salt, 0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);
    return ((n^(n>>>16))>>>0)/4294967295;
  };
  const bell=(salt:number)=>(sample(salt)+sample(salt+1)+sample(salt+2))/3;
  const size=0.88+bell(101)*0.24;
  return {size, appetite:size*size, strength:size*(0.9+bell(201)*0.2),
    speed:(0.9+bell(301)*0.2)/size, fighting:0.85+bell(401)*0.3,
    trading:0.8+bell(501)*0.4};
}

export function personName(u:Unit) {
  if(u.name)return u.name;
  const given=["Aren","Bela","Cora","Dara","Eren","Fara","Galen","Hana","Iven","Jora","Kelan","Lina","Maren","Nara","Orin","Pera","Rian","Sela","Taren","Vela"];
  return given[u.id%given.length];
}

export function citizenName(seed:number,id:number,team:number) {
  const names=["Aren","Bela","Cora","Dara","Eren","Fara","Galen","Hana","Iven","Jora","Kelan","Lina","Maren","Nara","Orin","Pera","Rian","Sela","Taren","Vela","Asha","Bran","Ceri","Dain","Eira","Fenn","Gara","Halen","Ina","Jalen","Kira","Luan","Mira","Neri","Ona","Pavo","Runa","Soren","Tala","Una","Varo","Wren","Yara","Zora","Aven","Bryn","Dema","Enna","Freya","Ilan","Lero","Mavi","Niko","Oren","Rala","Suri","Toma","Vina","Aila","Eska","Kato","Nela","Rami","Sana"];
  let h=Math.imul(seed^(team*7919),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);
  return names[((h>>>0)+id*17)%names.length];
}

/** Invented phonologies, rather than modern English place names or surnames. */
export function prehistoricName(seed:number,identity:number) {
  const languages=[
    [["Ak","Ur","En","Shur","Tal","Or","Khur","Nim"],["ara","umu","esh","aku","on","ila","un","eth"]],
    [["Tu","Ka","Ou","Na","Sha","Ku","Ar","Esh"],["raka","lun","mar","nak","aru","mai","ruk","ana"]],
    [["Ish","Ush","Kar","Thur","Oru","Aga","Kel","Mok"],["enna","ush","ani","ara","um","esh","aku","or"]],
  ];
  let h=Math.imul(seed^identity,0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);h=(h^(h>>>16))>>>0;
  const [starts,ends]=languages[(seed>>>0)%languages.length];
  return starts[h%starts.length]+ends[(h>>>8)%ends.length];
}
