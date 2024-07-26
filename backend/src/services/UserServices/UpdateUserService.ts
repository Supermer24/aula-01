import * as Yup from "yup";

import AppError from "../../errors/AppError";
import ShowUserService from "./ShowUserService";
import Company from "../../models/Company";
import User from "../../models/User";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  companyId?: number;
  queueIds?: number[];
  whatsappId?: number;
}

interface Request {
  userData: UserData;
  userId: string | number;
  companyId: number;
  requestUserId: number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId,
  companyId,
  requestUserId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId);

  // Verificar se o usuário é um super administrador
  if (user.super && userData.profile === "user") {
    // Verificar se o usuário está tentando alterar seu próprio perfil para "user"
    if (user.id === requestUserId) {
      throw new AppError("ERR_CANNOT_CHANGE_SUPER_ADMIN_PROFILE_TO_USER");
    }
    // Se não for o próprio usuário tentando alterar seu perfil, lançar um erro padrão
    throw new AppError("ERR_CANNOT_EDIT_SUPER_USER_PROFILE");
  }

  // Verificar se o usuário é um super administrador e está tentando editar outro usuário
  if (user.super && user.id !== requestUserId) {
    const requestUser = await User.findByPk(requestUserId);
    if (!requestUser || requestUser.super) {
      throw new AppError("ERR_CANNOT_EDIT_SUPER_USER");
    }
  }

  const requestUser = await User.findByPk(requestUserId);

  if (requestUser.super === false && userData.companyId !== companyId) {
    throw new AppError("O usuário não pertence a esta empresa");
  }

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string()
  });

  const { email, password, profile, name, queueIds = [], whatsappId } = userData;

  try {
    await schema.validate({ email, password, profile, name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await user.update({
    email,
    password,
    profile,
    name,
    whatsappId: whatsappId || null,
  });

  await user.$set("queues", queueIds);

  await user.reload();

  const company = await Company.findByPk(user.companyId);

  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    companyId: user.companyId,
    company,
    queues: user.queues
  };

  return serializedUser;
};

export default UpdateUserService;
