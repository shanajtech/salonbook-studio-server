export const fail = (status,message) => Object.assign(new Error(message),{status});
export const clean = value => typeof value === 'string' ? value.trim() : '';
export const escapeRegex = value => value.replace(/[.*+?^$${}()|[\]\\]/g,'\\$&');
export const profile = user => ({id:String(user._id),name:user.name,email:user.email,image:user.image,phone:user.phone,role:user.role,isBlocked:user.isBlocked,createdAt:user.createdAt});
export const imageURL = value => {
  const url = new URL(value);
  if (!['https:','http:'].includes(url.protocol)) throw fail(400,'Enter a valid image URL.');
  return url.href;
};
