import {validateWorkspace} from './backup.js';
import {WorkspaceConflictError} from './accounts.js';
export const organizationRoles={owner:'Owner',admin:'Administrator',editor:'Editor',viewer:'View only'};
export const canEditOrganization=org=>!org||['owner','admin','editor'].includes(org.role);
export const canManageOrganization=org=>org&&['owner','admin'].includes(org.role);
const uuid=value=>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||''))throw new Error('Invalid organization or member ID.');return value;};
export class OrganizationClient {
 constructor(accounts){this.accounts=accounts;}
 async rpc(name,body={}){this.accounts.userId();return this.accounts.request('/rest/v1/rpc/org_'+name,{method:'POST',body,authenticated:true});}
 async list(){const value=await this.rpc('list');if(!Array.isArray(value?.organizations)||!Array.isArray(value?.invitations))throw new Error('Invalid organization list.');return value;}
 create(name,workspace){return this.rpc('create',{org_name:name,initial_workspace:validateWorkspace(workspace)});}
 sendInviteEmail(email){const redirect=location.origin+location.pathname;return this.accounts.request('/auth/v1/otp?redirect_to='+encodeURIComponent(redirect),{method:'POST',body:{email,create_user:true}});}
 members(id){return this.rpc('members',{org:uuid(id)});}
 invite(id,email,role){return this.rpc('invite',{org:uuid(id),address:email,member_role:role});}
 accept(id){return this.rpc('accept',{invitation:uuid(id)});}
 decline(id){return this.rpc('decline',{invitation:uuid(id)});}
 revoke(id,invitation){return this.rpc('revoke_invite',{org:uuid(id),invitation:uuid(invitation)});}
 role(id,member,role){return this.rpc('change_role',{org:uuid(id),member:uuid(member),member_role:role});}
 remove(id,member){return this.rpc('remove_member',{org:uuid(id),member:uuid(member)});}
 transfer(id,member){return this.rpc('transfer',{org:uuid(id),member:uuid(member)});}
 rename(id,name){return this.rpc('rename',{org:uuid(id),org_name:name});}
 delete(id){return this.rpc('delete',{org:uuid(id)});}
 async snapshot(id,knownRevision=null){const value=await this.rpc('snapshot',{org:uuid(id),known_revision:knownRevision});if(!value||value.id!==id||!Number.isSafeInteger(value.revision)||!Object.hasOwn(organizationRoles,value.role))throw new Error('Invalid shared workspace response.');return {...value,workspace:value.workspace===null?null:validateWorkspace(value.workspace)};}
 filePath(id,path){if(!id)throw new Error("Open the organization that owns this file before downloading.");uuid(id);if(typeof path!=='string'||!path.startsWith(id+'/')||path.split('/').length!==3||path.includes('..'))throw new Error('This file belongs to another organization.');return path.split('/').map(encodeURIComponent).join('/');}
 uploadFile(id,path,file){if(!file?.size||file.size>10*1024*1024)throw new Error('Choose a nonempty file up to 10 MB.');return this.accounts.request('/storage/v1/object/organization-files/'+this.filePath(id,path),{method:'POST',authenticated:true,binary:true,body:file,headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'}});}
 downloadFile(id,path){return this.accounts.request('/storage/v1/object/authenticated/organization-files/'+this.filePath(id,path),{authenticated:true,responseType:'blob'});}
 deleteFile(id,path){this.filePath(id,path);return this.accounts.request('/storage/v1/object/organization-files',{method:'DELETE',authenticated:true,body:{prefixes:[path]}});}
 async save(id,revision,workspace){try{const value=await this.rpc('save',{org:uuid(id),expected_revision:revision,new_workspace:validateWorkspace(workspace)});if(!Number.isSafeInteger(value?.revision)||value.revision<=revision)throw new Error('The shared save could not be verified.');return value;}catch(error){if(error.code==='40001'||error.status===409)throw new WorkspaceConflictError();throw error;}}
}
