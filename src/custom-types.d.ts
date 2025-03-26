interface AuthUser{
  id:string;
  name: string;
  email:string;
  image?:body.image,
};


declare namespace Express{
  export interface Request{
    user?:AuthUser;
  }
}